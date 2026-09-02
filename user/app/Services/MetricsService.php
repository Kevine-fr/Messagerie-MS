<?php

namespace App\Services;

/**
 * Métriques Prometheus, sans dépendance externe.
 *
 * Exposées par la route `GET /metrics` (routes/web.php) et lues par le
 * Prometheus du VPS via le réseau Docker « web » (`messagerie-service-user:8000`). L'endpoint
 * est bloqué publiquement par nginx (`location = /metrics { return 404; }`).
 *
 * Deux contraintes ont dicté l'implémentation :
 *
 *  1. PHP-FPM n'a pas de mémoire partagée entre requêtes : l'état est donc
 *     sérialisé dans un fichier, relu et réécrit à chaque requête, sous verrou
 *     exclusif (`flock`). Sans le verrou, deux workers concurrents écrasent
 *     mutuellement leurs incréments.
 *  2. L'empreinte doit rester bornée. Un histogramme conserve donc les
 *     *compteurs de seaux* (11 entiers), jamais la liste des mesures : garder
 *     les valeurs brutes ferait grossir le fichier sans fin, et chaque requête
 *     paierait la relecture d'un fichier de plus en plus gros.
 */
class MetricsService
{
    /** Seaux d'histogramme — identiques aux autres services du VPS. */
    private const BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

    /**
     * Garde-fou de cardinalité : au-delà, on cesse de créer des séries.
     * Une route inattendue (scan, fuzzing) ne doit pas pouvoir faire enfler le
     * fichier ni la base Prometheus.
     */
    private const MAX_SERIES = 2000;

    private static function file(): string
    {
        return sys_get_temp_dir() . '/prometheus_metrics.json';
    }

    /**
     * Lit, modifie et réécrit l'état en une seule section critique.
     *
     * @param callable(array): array $mutate
     */
    private static function withLock(callable $mutate): void
    {
        $path = self::file();
        $handle = @fopen($path, 'c+');
        if ($handle === false) {
            return; // Métriques indisponibles : jamais au prix d'une erreur applicative.
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                return;
            }

            $size = (int) (fstat($handle)['size'] ?? 0);
            $raw = $size > 0 ? (string) fread($handle, $size) : '';
            $metrics = $raw !== '' ? json_decode($raw, true) : [];
            if (!is_array($metrics)) {
                $metrics = [];
            }

            $metrics = $mutate($metrics);

            $encoded = json_encode($metrics);
            if ($encoded !== false) {
                ftruncate($handle, 0);
                rewind($handle);
                fwrite($handle, $encoded);
                fflush($handle);
            }
            flock($handle, LOCK_UN);
        } finally {
            fclose($handle);
        }
    }

    private static function buildKey(string $name, array $labels): string
    {
        ksort($labels);
        return $name . ':' . json_encode($labels);
    }

    public static function incrementCounter(string $name, array $labels = [], int $value = 1): void
    {
        self::withLock(function (array $metrics) use ($name, $labels, $value) {
            $key = self::buildKey($name, $labels);
            if (!isset($metrics[$key])) {
                if (count($metrics) >= self::MAX_SERIES) {
                    return $metrics;
                }
                $metrics[$key] = [
                    'name'   => $name,
                    'type'   => 'counter',
                    'labels' => $labels,
                    'value'  => 0,
                ];
            }
            $metrics[$key]['value'] += $value;

            return $metrics;
        });
    }

    public static function observeHistogram(string $name, array $labels = [], float $value = 0): void
    {
        self::withLock(function (array $metrics) use ($name, $labels, $value) {
            $key = self::buildKey($name, $labels);
            if (!isset($metrics[$key])) {
                if (count($metrics) >= self::MAX_SERIES) {
                    return $metrics;
                }
                $metrics[$key] = [
                    'name'    => $name,
                    'type'    => 'histogram',
                    'labels'  => $labels,
                    // Un compteur par seau : taille fixe, quel que soit le trafic.
                    'buckets' => array_fill(0, count(self::BUCKETS), 0),
                    'count'   => 0,
                    'sum'     => 0.0,
                ];
            }

            foreach (self::BUCKETS as $index => $bound) {
                if ($value <= $bound) {
                    $metrics[$key]['buckets'][$index]++;
                }
            }
            $metrics[$key]['count']++;
            $metrics[$key]['sum'] += $value;

            return $metrics;
        });
    }

    private static function formatLabels(array $labels): string
    {
        if (empty($labels)) {
            return '';
        }

        $pairs = [];
        foreach ($labels as $key => $value) {
            // Échappement exigé par le format d'exposition Prometheus.
            $escaped = str_replace(['\\', '"', "\n"], ['\\\\', '\\"', '\\n'], (string) $value);
            $pairs[] = "{$key}=\"{$escaped}\"";
        }

        return '{' . implode(',', $pairs) . '}';
    }

    public static function export(): string
    {
        $path = self::file();
        if (!file_exists($path)) {
            return "# No metrics collected yet\n";
        }

        $handle = @fopen($path, 'r');
        if ($handle === false) {
            return "# No metrics collected yet\n";
        }

        // Verrou partagé : on lit un état cohérent sans bloquer les autres
        // lecteurs, mais sans risquer de lire une écriture à moitié faite.
        $raw = '';
        if (flock($handle, LOCK_SH)) {
            $raw = (string) stream_get_contents($handle);
            flock($handle, LOCK_UN);
        }
        fclose($handle);

        $metrics = $raw !== '' ? json_decode($raw, true) : [];
        if (!is_array($metrics) || empty($metrics)) {
            return "# No metrics collected yet\n";
        }

        $grouped = [];
        foreach ($metrics as $metric) {
            $grouped[$metric['name']][] = $metric;
        }

        $output = [];
        foreach ($grouped as $name => $series) {
            $type = $series[0]['type'];
            $output[] = "# HELP {$name} Application metric";
            $output[] = "# TYPE {$name} {$type}";

            foreach ($series as $metric) {
                if ($type === 'histogram') {
                    // Les seaux Prometheus sont cumulatifs : chaque compteur
                    // inclut déjà les seaux inférieurs (cf. observeHistogram).
                    foreach (self::BUCKETS as $index => $bound) {
                        $labels = self::formatLabels(
                            array_merge($metric['labels'], ['le' => (string) $bound])
                        );
                        $output[] = "{$name}_bucket{$labels} {$metric['buckets'][$index]}";
                    }
                    $infLabels = self::formatLabels(
                        array_merge($metric['labels'], ['le' => '+Inf'])
                    );
                    $output[] = "{$name}_bucket{$infLabels} {$metric['count']}";

                    $labels = self::formatLabels($metric['labels']);
                    $output[] = "{$name}_sum{$labels} {$metric['sum']}";
                    $output[] = "{$name}_count{$labels} {$metric['count']}";
                } else {
                    $labels = self::formatLabels($metric['labels']);
                    $output[] = "{$name}{$labels} {$metric['value']}";
                }
            }
        }

        return implode("\n", $output) . "\n";
    }

    public static function reset(): void
    {
        $path = self::file();
        if (file_exists($path)) {
            @unlink($path);
        }
    }
}

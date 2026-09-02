<?php

namespace App\Http\Middleware;

use App\Services\MetricsService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Compte et chronomètre chaque requête HTTP pour Prometheus.
 *
 * Les noms de métriques (`http_requests_total`, `http_request_duration_seconds`)
 * et les labels sont ceux des autres applications Laravel du VPS : le dashboard
 * Grafana « Frameworks / Laravel » fonctionne donc sans variante par appli.
 */
class CollectMetrics
{
    /**
     * Valeur du label `env`.
     *
     * Le dashboard Laravel partagé segmente par `env` : y mettre « production »
     * mélangerait le service User avec les autres API Laravel du VPS dans les mêmes
     * courbes. On y met donc le nom de l'application, suffixé par
     * l'environnement quand il ne s'agit pas de la production.
     */
    private function envLabel(): string
    {
        $env = (string) config('app.env', 'production');

        return $env === 'production' ? 'messagerie-user' : "messagerie-user-{$env}";
    }

    public function handle(Request $request, Closure $next): Response
    {
        $start = microtime(true);

        $response = $next($request);

        $duration = microtime(true) - $start;
        $path = $this->normalizePath($request->path());
        $env = $this->envLabel();

        MetricsService::incrementCounter('http_requests_total', [
            'method' => $request->method(),
            'path'   => $path,
            'status' => (string) $response->getStatusCode(),
            'env'    => $env,
        ]);

        MetricsService::observeHistogram('http_request_duration_seconds', [
            'method' => $request->method(),
            'path'   => $path,
            'env'    => $env,
        ], $duration);

        return $response;
    }

    /**
     * Remplace les segments variables par un gabarit.
     *
     * Sans cela, chaque identifiant (et chaque slug, et chaque UUID) créerait
     * une série Prometheus de plus : la cardinalité exploserait et la base
     * grossirait pour rien.
     */
    private function normalizePath(string $path): string
    {
        $path = preg_replace(
            '#/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}#i',
            '/{uuid}',
            $path
        );
        $path = preg_replace('#/\d+#', '/{id}', $path);

        if (strlen($path) > 50) {
            $path = substr($path, 0, 47) . '...';
        }

        return $path !== '' ? $path : '/';
    }
}

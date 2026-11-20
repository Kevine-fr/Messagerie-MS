<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Le 19/11/2026, PHP 8.2.36 a corrigé dix-sept failles (injection d'objets
 * par la session CVE-2026-115560, use-after-free du fuseau horaire
 * CVE-2026-129496…). Les images partaient de « php:8.2-fpm » : une étiquette
 * flottante, qui ne dit pas quelle version tourne et laisse en place une
 * image bâtie avant le correctif. Les versions sont donc
 * figées, et ce test refuse une étiquette flottante ou antérieure au correctif.
 */
class ImageDockerTest extends TestCase
{
    /** Plus petite version corrigée, par branche. */
    private const MINIMUM = ['8.2' => '8.2.36', '8.3' => '8.3.37', '8.4' => '8.4.28', '8.5' => '8.5.13'];

    public static function phpSur(string $etiquette): bool
    {
        if (! preg_match('/^(\d+\.\d+)\.\d+/', $etiquette, $m)) {
            return false; // flottante : 8.2-fpm, fpm, latest…
        }
        $minimum = self::MINIMUM[$m[1]] ?? null;
        if ($minimum === null) {
            return version_compare($m[0], '8.6.0', '>=');
        }

        return version_compare($m[0], $minimum, '>=');
    }

    public function test_reconnait_les_etiquettes_vulnerables(): void
    {
        foreach (['8.2-fpm', 'fpm', '8.2.35-cli', '8.1.31-fpm', '8.4.27-cli'] as $e) {
            $this->assertFalse(self::phpSur($e), $e);
        }
        foreach (['8.2.36-cli', '8.3.37-fpm', '8.4.28-cli', '8.6.0-fpm'] as $e) {
            $this->assertTrue(self::phpSur($e), $e);
        }
    }

    public function test_chaque_dockerfile_part_dune_version_corrigee(): void
    {
        $racine = dirname(__DIR__, 2);
        foreach (['Dockerfile.prod', 'Dockerfile.user', 'Dockerfile'] as $fichier) {
            $contenu = file_get_contents("{$racine}/{$fichier}");
            $this->assertSame(1, preg_match('/^FROM\s+php:(\S+)/m', $contenu, $m), "{$fichier} : FROM php introuvable");
            $this->assertTrue(self::phpSur($m[1]), "{$fichier} : php:{$m[1]} n'est pas une version corrigée et figée");
        }
    }

    public function test_php_est_durci(): void
    {
        $racine = dirname(__DIR__, 2);
        $ini = parse_ini_file("{$racine}/docker/php-securite.ini", false, INI_SCANNER_TYPED);
        $this->assertFalse((bool) ($ini['session.upload_progress.enabled'] ?? true), 'session.upload_progress.enabled = 0');
        $this->assertTrue($ini['zend.exception_ignore_args'] ?? null);
        $this->assertFalse($ini['expose_php'] ?? null);

        foreach (['Dockerfile.prod', 'Dockerfile.user'] as $fichier) {
            $this->assertStringContainsString('docker/php-securite.ini', file_get_contents("{$racine}/{$fichier}"), $fichier);
        }
    }
}

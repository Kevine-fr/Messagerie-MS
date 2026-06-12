<?php

namespace App\Providers;

use App\Contracts\MediaStorage;
use App\Services\Storage\CloudinaryMediaStorage;
use App\Services\Storage\MinioMediaStorage;
use Illuminate\Support\ServiceProvider;

/**
 * Lie App\Contracts\MediaStorage à l'implémentation choisie par MEDIA_DRIVER.
 * Injecter MediaStorage dans un contrôleur suffit : aucun couplage au SDK.
 */
class MediaStorageServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(MediaStorage::class, function () {
            return match (config('media.driver')) {
                'minio', 's3' => new MinioMediaStorage(),
                default => new CloudinaryMediaStorage(),
            };
        });
    }
}

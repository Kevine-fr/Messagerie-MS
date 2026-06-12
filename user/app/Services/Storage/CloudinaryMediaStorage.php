<?php

namespace App\Services\Storage;

use App\Contracts\MediaStorage;
use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;
use Illuminate\Http\UploadedFile;

/**
 * Implémentation Cloudinary de {@see MediaStorage}.
 *
 * `resource_type=auto` laisse Cloudinary détecter image / vidéo / brut (raw),
 * ce qui couvre photos, vidéos et documents avec un seul appel.
 */
class CloudinaryMediaStorage implements MediaStorage
{
    public function store(UploadedFile $file, string $folder): array
    {
        $result = Cloudinary::uploadApi()->upload($file->getRealPath(), [
            'folder' => $folder,
            'resource_type' => 'auto',
        ]);

        return [
            'url' => $result['secure_url'],
            'public_id' => $result['public_id'],
            'type' => $result['resource_type'] ?? 'raw',
            'bytes' => (int) ($result['bytes'] ?? $file->getSize()),
            'format' => $result['format'] ?? null,
            'mime' => $file->getMimeType(),
        ];
    }

    public function delete(string $publicId, string $type = 'image'): bool
    {
        $response = Cloudinary::uploadApi()->destroy($publicId, [
            'resource_type' => $type,
        ]);

        return ($response['result'] ?? null) === 'ok';
    }
}

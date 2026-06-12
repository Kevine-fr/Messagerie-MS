<?php

namespace App\Services\Storage;

use App\Contracts\MediaStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Implémentation MinIO / S3 de {@see MediaStorage}, via le disque `s3` de
 * Laravel (compatible MinIO grâce à `endpoint` + `use_path_style_endpoint`).
 *
 * Le `public_id` renvoyé est le chemin de l'objet dans le bucket : il sert de
 * clé pour {@see delete()}.
 */
class MinioMediaStorage implements MediaStorage
{
    private const DISK = 's3';

    public function store(UploadedFile $file, string $folder): array
    {
        $disk = Storage::disk(self::DISK);

        $extension = $file->getClientOriginalExtension();
        $filename = Str::uuid()->toString() . ($extension !== '' ? ".{$extension}" : '');
        $directory = trim($folder, '/');
        $path = "{$directory}/{$filename}";

        $disk->putFileAs($directory, $file, $filename, 'public');

        return [
            'url' => $disk->url($path),
            'public_id' => $path,
            'type' => $this->resourceType($file->getMimeType()),
            'bytes' => (int) $file->getSize(),
            'format' => $extension !== '' ? $extension : null,
            'mime' => $file->getMimeType(),
        ];
    }

    public function delete(string $publicId, string $type = 'image'): bool
    {
        return Storage::disk(self::DISK)->delete($publicId);
    }

    private function resourceType(?string $mime): string
    {
        if ($mime === null) {
            return 'raw';
        }
        if (str_starts_with($mime, 'image/')) {
            return 'image';
        }
        if (str_starts_with($mime, 'video/')) {
            return 'video';
        }

        return 'raw';
    }
}

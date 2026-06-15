<?php

namespace App\Http\Controllers;

use App\Contracts\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * Upload générique de pièces jointes (photos, vidéos, documents).
 * Le stockage est délégué à {@see MediaStorage} (Cloudinary ou MinIO selon
 * MEDIA_DRIVER) : ce contrôleur ne connaît aucun SDK de fournisseur.
 */
class MediaController extends Controller
{
    public function upload(Request $request, MediaStorage $storage)
    {
        try {
            // Le client indique le type (image|video|file) pour appliquer la
            // bonne limite et un message d'erreur précis.
            $type = $request->input('type', 'file');
            $maxKb = $this->maxKbFor($type);
            $maxMb = (int) round($maxKb / 1024);

            $label = $type === 'image' ? 'image' : ($type === 'video' ? 'vidéo' : 'document');

            $validator = Validator::make($request->all(), [
                'file' => "required|file|max:{$maxKb}",
            ], [
                'file.required' => 'Aucun fichier reçu.',
                'file.file' => 'Le fichier est invalide.',
                'file.max' => "Le {$label} dépasse la taille maximale autorisée ({$maxMb} Mo).",
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => $validator->errors()->first('file'),
                    'errors' => $validator->errors(),
                ], 422);
            }

            $file = $request->file('file');
            $folder = config('media.folder', 'Messagerie-mS');

            $result = $storage->store($file, $folder);

            return response()->json([
                'url' => $result['url'],
                'public_id' => $result['public_id'],
                'type' => $this->category($result['type'], $file->getMimeType()),
                'name' => $file->getClientOriginalName(),
                'size' => $result['bytes'],
                'mime' => $result['mime'] ?? $file->getMimeType(),
            ], 201);
        } catch (\Throwable $th) {
            Log::error('Media upload error: ' . $th->getMessage());

            return response()->json([
                'message' => "Erreur lors de l'envoi du fichier sur le serveur de stockage.",
                'errors' => config('app.debug') ? $th->getMessage() : null,
            ], 500);
        }
    }

    private function maxKbFor(string $type): int
    {
        return match ($type) {
            'image' => (int) config('media.max_sizes.image', 15360),
            'video' => (int) config('media.max_sizes.video', 102400),
            default => (int) config('media.max_sizes.document', 51200),
        };
    }

    /**
     * Catégorie applicative renvoyée au client : image | video | file.
     */
    private function category(string $resourceType, ?string $mime): string
    {
        if ($resourceType === 'image' || ($mime && str_starts_with($mime, 'image/'))) {
            return 'image';
        }
        if ($resourceType === 'video' || ($mime && str_starts_with($mime, 'video/'))) {
            return 'video';
        }

        return 'file';
    }
}

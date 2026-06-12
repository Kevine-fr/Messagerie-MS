<?php

namespace App\Http\Controllers;

use App\Contracts\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

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
            // Plafond global (le client choisit le type) — limites fines
            // possibles via config/media.php côté produit.
            $maxKb = max(
                config('media.max_sizes.image', 10240),
                config('media.max_sizes.video', 51200),
                config('media.max_sizes.document', 20480),
            );

            $request->validate([
                'file' => "required|file|max:{$maxKb}",
            ]);

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
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Fichier invalide ou trop volumineux.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $th) {
            Log::error('Media upload error: ' . $th->getMessage());

            return response()->json([
                'message' => "Erreur lors de l'envoi du fichier !",
                'errors' => config('app.debug') ? $th->getMessage() : null,
            ], 500);
        }
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

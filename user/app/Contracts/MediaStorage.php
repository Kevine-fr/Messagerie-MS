<?php

namespace App\Contracts;

use Illuminate\Http\UploadedFile;

/**
 * Abstraction du stockage des médias (photos de profil, pièces jointes).
 *
 * Permet de basculer de fournisseur (Cloudinary, MinIO/S3, …) en changeant
 * uniquement la variable d'environnement MEDIA_DRIVER : aucun appel direct au
 * SDK d'un fournisseur ne doit subsister dans les contrôleurs.
 */
interface MediaStorage
{
    /**
     * Stocke un fichier et renvoie ses métadonnées normalisées.
     *
     * @return array{
     *     url: string,
     *     public_id: string,
     *     type: string,   // image|video|raw
     *     bytes: int,
     *     format: ?string,
     *     mime: ?string
     * }
     */
    public function store(UploadedFile $file, string $folder): array;

    /**
     * Supprime un fichier précédemment stocké.
     *
     * @param string $publicId Identifiant renvoyé par store() (public_id).
     * @param string $type     image|video|raw (utile pour Cloudinary).
     */
    public function delete(string $publicId, string $type = 'image'): bool;
}

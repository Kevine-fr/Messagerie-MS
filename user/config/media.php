<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Pilote de stockage des médias
    |--------------------------------------------------------------------------
    |
    | Sélectionne l'implémentation de App\Contracts\MediaStorage utilisée par
    | toute l'application. Pour basculer de fournisseur, il suffit de changer
    | cette variable d'environnement (et de renseigner les variables associées) :
    |
    |   MEDIA_DRIVER=cloudinary   -> CLOUDINARY_* (config/filesystems.php)
    |   MEDIA_DRIVER=minio        -> AWS_* (disque s3, compatible MinIO)
    |
    | Supportés : "cloudinary", "minio" (alias "s3").
    |
    */

    'driver' => env('MEDIA_DRIVER', 'cloudinary'),

    // Dossier / préfixe sous lequel ranger les médias.
    'folder' => env('MEDIA_FOLDER', 'Messagerie-mS'),

    /*
    |--------------------------------------------------------------------------
    | Limites de taille (en kilo-octets) par catégorie
    |--------------------------------------------------------------------------
    | Utilisées par la validation de l'upload média.
    */

    'max_sizes' => [
        'image' => (int) env('MEDIA_MAX_IMAGE_KB', 15360),      // 15 Mo
        'video' => (int) env('MEDIA_MAX_VIDEO_KB', 102400),     // 100 Mo
        'document' => (int) env('MEDIA_MAX_DOCUMENT_KB', 51200), // 50 Mo
    ],
];

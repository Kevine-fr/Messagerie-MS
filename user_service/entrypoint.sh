# Génération de la Key
php artisan key:generate

# Mise en cache Laravel pour prod
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Migration des tables a la BD
php artisan migrate --force

# Démarrer Nginx & PHP-FPM
php-fpm
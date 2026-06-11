#!/bin/sh
set -e

# Utilise l'APP_KEY fournie via l'environnement ; en genere une ephemere si absente.
if [ -z "$APP_KEY" ]; then
  echo "⚠️  APP_KEY absente : generation d'une cle ephemere (a definir en secret pour la prod)."
  export APP_KEY="$(php artisan key:generate --show)"
fi

# Optimisations de production (config/routes mises en cache).
php artisan config:cache
php artisan route:cache

# Migration des tables (idempotent).
php artisan migrate --force

# Demarrage du serveur HTTP (derriere le reverse proxy nginx).
exec php artisan serve --host=0.0.0.0 --port=8000

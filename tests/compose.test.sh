#!/usr/bin/env bash
# Le déploiement fait `docker compose pull` puis `up` : une seule image
# introuvable fait tout échouer. Le 18/11, minio/mc (retirée de Docker Hub)
# a bloqué la livraison des trois services. Les images des services lancés
# par défaut doivent donc être connues : les nôtres, ou une liste vérifiée.
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
# Variables obligatoires (`:?`) du compose : des valeurs factices suffisent ici.
export DOCKERHUB_USERNAME=moi JWT_SECRET=x IMAGE_TAG=t CORS_ORIGIN=x

images="$(docker compose -f "$RACINE/docker-compose.prod.yml" config --images 2>/dev/null | sort -u)"
[ -n "$images" ] || { echo "✗ compose illisible" >&2; exit 1; }

echec=0
while read -r img; do
  case "$img" in
    moi/messagerie-*) ;;                                   # nos images
    mysql:*|mongo:*|confluentinc/cp-kafka:*) ;;
    prom/mysqld-exporter:*|percona/mongodb_exporter:*) ;;
    *) echo "✗ image lancée par défaut, non vérifiée : $img" >&2; echec=1 ;;
  esac
done <<<"$images"
[ "$echec" = 0 ] && echo "✓ compose : images lancées par défaut connues"
exit "$echec"

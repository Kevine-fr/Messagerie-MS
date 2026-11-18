#!/usr/bin/env bash
# Restaure une sauvegarde faite par scripts/backup.sh (les deux bases).
#
#   ./scripts/backup.sh                       # l'état actuel, d'abord
#   ./scripts/restore.sh backups/<horodatage>/messagerie-<horodatage>.tar
set -euo pipefail

FICHIER="${1:?Usage : restore.sh <messagerie-AAAAMMJJ-HHMMSS.tar>}"
MYSQL_CONTAINER="${MESSAGERIE_MYSQL_CONTAINER:-messagerie-mysql}"
MONGO_CONTAINER="${MESSAGERIE_MONGO_CONTAINER:-messagerie-mongodb}"
[ -s "$FICHIER" ] || { echo "Archive introuvable ou vide : $FICHIER" >&2; exit 1; }
TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT
tar xf "$FICHIER" -C "$TRAVAIL"

echo "MySQL : restauration dans $MYSQL_CONTAINER…" >&2
# Le dump contient DROP TABLE / CREATE TABLE : les tables sont remplacées.
gzip -dc "$TRAVAIL/mysql.sql.gz" \
  | docker exec -i "$MYSQL_CONTAINER" sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot'

echo "MongoDB : mongorestore --drop dans $MONGO_CONTAINER…" >&2
docker exec -i "$MONGO_CONTAINER" mongorestore --quiet --drop --archive --gzip < "$TRAVAIL/mongo.archive.gz"
echo "✓ Restauré." >&2

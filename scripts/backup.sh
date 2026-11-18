#!/usr/bin/env bash
# Sauvegarde de la Messagerie : MySQL (comptes, service user) ET MongoDB
# (messages, service message), dans une seule archive.
#
#   ./scripts/backup.sh                    -> backups/<horodatage>/messagerie-<horodatage>.tar
#   BACKUP_DIR=/srv/sauvegardes ./scripts/backup.sh
#
# Contrat commun aux dépôts du VPS (le dépôt Infrastructure envoie les
# sauvegardes sur MinIO) : un seul fichier écrit, son chemin en DERNIÈRE ligne
# de la sortie standard, les messages sur la sortie d'erreur.
#
# Les deux bases vont ensemble : les messages portent les identifiants des
# comptes MySQL. Restaurer l'une à une autre date que l'autre donne des
# conversations avec des inconnus. Les médias sont dans le MinIO du VPS,
# sauvegardé par le dépôt Infrastructure.
set -euo pipefail

MYSQL_CONTAINER="${MESSAGERIE_MYSQL_CONTAINER:-messagerie-mysql}"
MONGO_CONTAINER="${MESSAGERIE_MONGO_CONTAINER:-messagerie-mongodb}"
MONGO_DB="${MESSAGERIE_MONGO_DB:-messages_db}"
STAMP="$(date +%Y%m%d-%H%M%S)"
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${BACKUP_DIR:-$RACINE/backups/$STAMP}"
TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT
mkdir -p "$DEST"
FICHIER="$DEST/messagerie-$STAMP.tar"

echo "MySQL : mysqldump depuis $MYSQL_CONTAINER…" >&2
# Identifiants lus dans le conteneur lui-même (MYSQL_ROOT_PASSWORD) ; passés
# par MYSQL_PWD pour ne pas apparaître dans la liste des processus.
docker exec "$MYSQL_CONTAINER" sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --routines --triggers --databases "$MYSQL_DATABASE"' \
  | gzip > "$TRAVAIL/mysql.sql.gz"
if [ "$(gzip -dc "$TRAVAIL/mysql.sql.gz" | head -c 1 | wc -c)" -eq 0 ]; then
  echo "Échec : dump MySQL vide." >&2; exit 1
fi

echo "MongoDB : mongodump de « $MONGO_DB » depuis $MONGO_CONTAINER…" >&2
docker exec "$MONGO_CONTAINER" mongodump --quiet --db "$MONGO_DB" --archive --gzip > "$TRAVAIL/mongo.archive.gz"
[ -s "$TRAVAIL/mongo.archive.gz" ] || { echo "Échec : dump MongoDB vide." >&2; exit 1; }

tar cf "$FICHIER.part" -C "$TRAVAIL" .
mv "$FICHIER.part" "$FICHIER"
echo "✓ $(du -h "$FICHIER" | cut -f1)" >&2
echo "$FICHIER"

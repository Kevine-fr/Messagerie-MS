#!/usr/bin/env bash
# Épreuve du contrat de sauvegarde, sans Docker : un faux `docker` simule les
# deux bases dans un dossier temporaire.
#   bash tests/sauvegarde.test.sh
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin" "$T/base"
cat > "$T/bin/docker" <<'FAUX'
#!/usr/bin/env bash
shift; [ "$1" = "-i" ] && shift; shift
case "$*" in
  *mysqldump*) cat "$FAUX/base/mysql" ;;
  *"mysql -uroot"*) cat > "$FAUX/base/mysql" ;;
  *mongodump*) cat "$FAUX/base/mongo" ;;
  *mongorestore*) cat > "$FAUX/base/mongo" ;;
  *) echo "faux docker : commande inattendue $*" >&2; exit 2 ;;
esac
FAUX
chmod +x "$T/bin/docker"
export PATH="$T/bin:$PATH" FAUX="$T" BACKUP_DIR="$T/sauvegardes"

echo "CREATE TABLE users;" > "$T/base/mysql"
echo "messages" > "$T/base/mongo"
ARCHIVE="$(bash "$RACINE/scripts/backup.sh" 2>/dev/null | tail -n1)"
[ -s "$ARCHIVE" ] || { echo "ÉCHEC : pas d'archive ($ARCHIVE)"; exit 1; }

echo "abîmé" > "$T/base/mysql"; echo "abîmé" > "$T/base/mongo"
bash "$RACINE/scripts/restore.sh" "$ARCHIVE" 2>/dev/null
grep -q "CREATE TABLE users" "$T/base/mysql" || { echo "ÉCHEC : MySQL non restauré"; exit 1; }
grep -q messages "$T/base/mongo" || { echo "ÉCHEC : MongoDB non restauré"; exit 1; }

: > "$T/base/mysql"
if bash "$RACINE/scripts/backup.sh" >/dev/null 2>&1; then echo "ÉCHEC : un dump vide passe pour une sauvegarde"; exit 1; fi
echo "✓ sauvegarde/restauration : contrat tenu"

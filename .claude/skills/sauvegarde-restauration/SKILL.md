---
name: sauvegarde-restauration
description: Sauvegarder, restaurer ou revenir en arrière sur Messagerie — dump de la base avant une manipulation risquée, restauration d'une sauvegarde (locale ou MinIO), retour à la version précédente après un déploiement raté. À lancer quand on parle de sauvegarde, backup, restauration, rollback ou perte de données.
---

# Sauvegarde, restauration et retour arrière — Messagerie

Deux bases qui vont ensemble : MySQL (comptes) et MongoDB `messages_db` (messages, qui portent les identifiants des comptes). Les médias sont dans le MinIO du VPS, sauvegardé par le dépôt Infrastructure.

## Sauvegarder

Sur le VPS, depuis le dossier du projet :

```sh
./scripts/backup.sh            # -> backups/<horodatage>/…, chemin en dernière ligne
```

Toujours **avant** : une migration, un `docker compose down -v`, un changement
d'URL ou d'identifiants de base, une restauration (sauvegarder l'état actuel
d'abord, pour pouvoir annuler la restauration).

Les sauvegardes automatiques (planifiées, envoyées sur MinIO avec leur
rétention) sont faites par le dépôt **Infrastructure**, qui en décrit le
calendrier et le bucket. Pour en récupérer une : la télécharger depuis la
console MinIO (ou `mc cp`) puis la restaurer comme ci-dessous.

## Restaurer

```sh
./scripts/backup.sh                       # l'état actuel, d'abord
./scripts/restore.sh <fichier>            # puis la sauvegarde voulue
```

`restore.sh` recharge MySQL (le dump remplace les tables) puis fait un `mongorestore --drop` de `messages_db`. Toujours les deux ensemble, de la même archive.

Vérifier ensuite l'application (route de santé, une page qui lit la base) et
le tableau Grafana du projet : pas de pic de 5xx.

## Revenir à la version précédente du code

Le déploiement part de `main`. Pour annuler une livraison : une PR qui
`git revert` la fusion fautive, sur `dev` puis `dev` → `main`, et c'est Kévine
qui fusionne. Ne jamais pousser sur `main` ni réécrire son historique. Si la
version fautive a aussi migré la base, restaurer la sauvegarde prise avant le
déploiement **après** le retour du code, jamais avant.

## Ce qu'il ne faut jamais faire

- Restaurer sans avoir sauvegardé l'état présent.
- Copier une sauvegarde (qui contient des données personnelles ou des
  secrets) dans le dépôt, une issue, un ticket ou une conversation.
- Lancer `restore.sh` sur une base dont on n'a pas vérifié le nom du conteneur.

# Conventions de travail — Messagerie

Messagerie en microservices : passerelle Express (`apigateway/`, `messagerie-service-apigateway:8080`, seule porte d'entrée, vérifie le JWT), service user Laravel 12 (`user/`, MySQL `messagerie-mysql`), service message Node/Socket.IO (`message/`, MongoDB `messagerie-mongodb`) et son consommateur Kafka (`messagerie-consumer`). Kafka et MinIO sont ceux du dépôt Infrastructure. Les bases sont sur le réseau privé `messagerie_interne`, jamais sur `web`.

Mêmes règles que le dépôt FindUrJob, adaptées à ce projet. L'infrastructure
du VPS (Prometheus, Grafana, MinIO, nginx, entretien de la machine) vit dans
le dépôt **Infrastructure** : rien de tout cela ne s'ajoute ici.

## Git

- **Développer sur `dev`.** Jamais de commit direct sur `main`.
- **Toujours ouvrir une pull request `dev` → `main` en fin de tâche**, sans
  attendre qu'on la demande. C'est Kévine qui fusionne, jamais l'assistant.
- Ne jamais créer d'autre branche pour la PR : toujours `dev`.
- Le déploiement (`.github/workflows/deploy.yml` : version, images Docker Hub, VPS) ne part **que** d'un push sur `main` : tant que la PR n'est pas fusionnée, rien n'est livré. Un correctif pas encore visible en production est normal.
- `dev` peut avoir été fusionnée pendant qu'on travaillait : vérifier l'état de
  `main` avant d'ouvrir une PR. Une PR fusionnée est close, elle ne se
  réutilise pas : repartir de `main`.
- Messages de commit et titres de PR en anglais, corps en français.

## Avant de proposer un correctif

- **Regarder ce que `main` contient déjà.** Le dépôt avance en parallèle.
- Aucune base de données ni service de production n'est joignable depuis un
  environnement de développement distant : extraire des **fonctions pures** et
  les éprouver, ou monter les tests sur une base jetable. Le dire quand une
  vérification n'est pas possible, plutôt que d'affirmer.
- **Les tests** : `cd apigateway && npm ci && npm test ; cd message && npm ci && npm test ; cd user && composer install --ignore-platform-req=ext-rdkafka && vendor/bin/phpunit ; bash tests/sauvegarde.test.sh`. Ils doivent tous passer avant d'ouvrir ou de
  mettre à jour une PR. La CI (`.github/workflows/tests.yml`) les relance sur
  chaque PR et chaque push sur `dev` : ne jamais annoncer une PR prête sans
  sa coche verte, et lire le journal quand elle est rouge.
- Ne jamais sauter, désactiver ou affaiblir un test pour passer au vert.
- Tout bug corrigé ajoute son test — un test qui échouait avant la correction.

## Supervision et sauvegardes

- **Métriques** : `GET /metrics` sur les trois services (`messagerie-service-apigateway:8080`, `messagerie-service-message:3000`, `messagerie-service-user:8000`), mêmes séries partout : `http_requests_total` / `http_request_duration_seconds` {method, route, status_code}, route = modèle (jamais un identifiant). Bases : `mysqld-exporter-messagerie:9104`, `mongodb-exporter-messagerie:9216`. nginx ferme `/metrics` au public. Prometheus (dépôt Infrastructure) les lit
  par le réseau Docker `web` : ne changer ni le nom du conteneur, ni le port,
  ni le chemin sans mettre à jour `monitoring/prometheus/prometheus.yml` dans
  Infrastructure. Un test vérifie que la route répond.
- **Sauvegardes** : Deux bases qui vont ensemble : MySQL (comptes) et MongoDB `messages_db` (messages, qui portent les identifiants des comptes). Les médias sont dans le MinIO du VPS, sauvegardé par le dépôt Infrastructure. `scripts/backup.sh` écrit **un**
  fichier dans `$BACKUP_DIR` (défaut `backups/<horodatage>/`) et donne son
  chemin en dernière ligne ; `scripts/restore.sh <fichier>` le recharge. La
  sauvegarde automatique vers MinIO est faite par le dépôt Infrastructure,
  qui retrouve les conteneurs de base par leur image et leurs variables
  standard (`POSTGRES_*`, `MONGO_INITDB_*`, `MYSQL_*`) : ne pas les renommer.
- Lancer `scripts/backup.sh` avant toute manipulation risquée (migration,
  `down -v`, changement d'URL de base). Une base perdue ne se reconstitue pas.

## Skills

- `.claude/skills/revue-quotidienne/SKILL.md` : la revue des erreurs des
  dernières 24 h, corrigées avec un test, PR sur `dev`, rapport.
- `.claude/skills/sauvegarde-restauration/SKILL.md` : sauvegarder, restaurer,
  revenir en arrière après un déploiement raté.

## Style

- Code et commentaires en **français**. Les commentaires
  expliquent le *pourquoi* — souvent le bug passé qui justifie la ligne — pas
  le *quoi*.
- Aucun secret dans le dépôt : `.env.example` porte les clés, jamais les
  valeurs.

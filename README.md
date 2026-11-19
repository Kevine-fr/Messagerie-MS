# Messagerie

Messagerie instantanée découpée en microservices : passerelle Express qui vérifie le JWT, service utilisateurs Laravel sur MySQL, service messages Node et Socket.IO sur MongoDB, synchronisés par Kafka, médias sur MinIO.

## Architecture

| Service | Dossier | Rôle | Données |
|---|---|---|---|
| Passerelle | `apigateway/` | Seule porte d'entrée, vérifie le JWT, route vers les services | — |
| Utilisateurs | `user/` | Comptes, profils, authentification (Laravel 12) | MySQL `messagerie-mysql` |
| Messages | `message/` | Conversations et messages en temps réel (Node, Socket.IO) | MongoDB `messagerie-mongodb` |
| Consommateur | `message/` (`messagerie-consumer`) | Applique les événements Kafka `user.created/updated/deleted` | MongoDB |

Kafka et MinIO sont ceux du dépôt Infrastructure. Les bases restent sur le réseau privé `messagerie_interne`.

## Pile technique

Node.js, Express, Socket.IO, Laravel 12, MySQL, MongoDB, Kafka, MinIO, Docker.

## Démarrer en local

```bash
docker compose up -d
```

## Supervision, sauvegardes et tests

- **Métriques** : `GET /metrics` sur les trois services (`http_requests_total`, `http_request_duration_seconds` {method, route, status_code}), lues par le Prometheus du dépôt Infrastructure.
- **Sauvegarde** : `./scripts/backup.sh` (MySQL + MongoDB, un seul fichier) ; `./scripts/restore.sh <fichier>`. L'envoi sur MinIO est fait par le dépôt Infrastructure.
- **Tests** : `apigateway` et `message` (`npm test`), `user` (`vendor/bin/phpunit`), `bash tests/sauvegarde.test.sh`, `bash tests/compose.test.sh`.
- Conventions de travail : `CLAUDE.md`.

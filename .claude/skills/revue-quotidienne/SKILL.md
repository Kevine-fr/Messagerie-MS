---
name: revue-quotidienne
description: La revue quotidienne des erreurs de Messagerie — relever les erreurs serveur (5xx) et les plantages des dernières 24 h, les regrouper, reproduire les plus fréquentes, corriger avec un test, ouvrir la PR sur `dev` et rendre un rapport. À lancer quand on demande la revue des erreurs, le débogage de Messagerie, ou quand une Routine de nuit se déclenche.
---

# La revue quotidienne des erreurs — Messagerie

Reprise de la revue quotidienne de FindUrJob, adaptée à ce projet. **Le
rapport est le livrable** : une nuit sans correctif mais avec un diagnostic
juste vaut mieux qu'une PR sur une hypothèse.

Lire d'abord `CLAUDE.md` (branche `dev`, PR sans attendre, style français).

**Les crédits sont comptés.** Ordonner le travail pour que ce qui compte soit
acquis tôt : le tri et un rapport provisoire, puis chaque correction poussée
dès qu'elle est verte.

## 0. Prérequis

- `PROMETHEUS_URL` (ex. `https://prometheus.<domaine>`) et, s'il est protégé,
  `PROMETHEUS_AUTH` (`utilisateur:motdepasse`) doivent être dans
  l'environnement de la session. S'ils manquent, ou si l'hôte est refusé par
  le réseau : **ne rien inventer**. Le rapport dit quelle variable ou quel hôte
  manque et s'arrête là.
- `git fetch origin main dev`. Si `dev` a été fusionnée, repartir de `main`.
  Si une PR ouverte depuis `dev` porte un autre travail, ne rien pousser :
  rapport seul, en le disant.

## 1. Récupérer

Requêtes à `$PROMETHEUS_URL/api/v1/query` (`curl -s -u "$PROMETHEUS_AUTH"
--data-urlencode query=…`) :

- erreurs par service et route : `sum by (job, route, status_code) (increase(http_requests_total{job=~"messagerie-.*",status_code=~"5.."}[24h]))`
- passerelle → services injoignables (502) : `sum by (route) (increase(http_requests_total{job="messagerie-apigateway",status_code="502"}[24h]))`
- jetons refusés (401/403) : `sum by (status_code) (increase(http_requests_total{job="messagerie-apigateway",status_code=~"401|403"}[24h]))`
- retard du consommateur Kafka : `max_over_time(kafka_consumergroup_lag_sum{consumergroup=~".*message.*|user-service-group"}[24h])`

S'y ajoutent les sondes `probe_success{service=~"messagerie-.*"}` (indisponibilités)
et, pour les bases, `up{job=~"postgres|mongodb|mysql|redis"}`.

## 2. Trier — puis écrire le rapport provisoire

- Une route en 5xx plus de 1 % du temps passe avant une route lente.
- Une indisponibilité (`probe_success` à 0) passe avant tout : dire quand,
  combien de temps, et si le conteneur a redémarré
  (`changes(container_start_time_seconds{name=~"messagerie-.*"}[24h])`).
- **Hors de portée** : panne du VPS, base pleine, certificat — les signaler
  pour le dépôt Infrastructure, ne pas les « corriger » ici.

## 3. Reproduire et corriger

1. Lire le code de la route en cause sur `dev` **et** sur `main`.
2. Écrire d'abord le test qui reproduit l'erreur (cd apigateway && npm ci && npm test ; cd message && npm ci && npm test ; cd user && composer install --ignore-platform-req=ext-rdkafka && vendor/bin/phpunit ; bash tests/sauvegarde.test.sh). Il doit
   échouer avant la correction.
3. Corriger au plus près de la cause. Ne jamais élargir un `catch` pour faire
   taire une erreur : une erreur masquée est une erreur qu'on ne verra plus.
4. Relancer toute la suite. Ne jamais sauter ni affaiblir un test.

## 4. La PR

Un commit par cause corrigée (titre en anglais, corps en français), poussé sur
`dev`, puis une PR `dev` → `main` — ou la mise à jour de celle de la revue
précédente si elle n'est pas fusionnée. Titre : `fix: review JJ/MM — <causes>`.
Lire le verdict de la CI (`tests.yml`) avant de finir ; rouge, lire le journal,
corriger, repousser. Ne jamais fusionner : c'est Kévine qui fusionne.

## 5. Le rapport

Court, en français : en un coup d'œil (requêtes, taux d'erreur, latence p95,
disponibilité), corrigé (cause, volume, test ajouté, lien de la PR — rien n'est
en production avant la fusion), diagnostiqué non corrigé (hypothèse et ce qui
manque), pour toi (ce que l'assistant ne peut pas faire), limites de la nuit.
Une nuit sans erreur : une ligne.

# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/sure-finance.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Sure

Suivi de finances personnelles axé sur la confidentialité, avec support multi-devises, synchronisation bancaire et outils de budget.

| | |
| --- | --- |
| **Image** | `ghcr.io/we-promise/sure:stable` |
| **Interface web** | `http://your-server:3005` |
| **Chemin de configuration** | `{BASE_DIR}/sure/postgres` |
| **Site web** | [sure.am](https://sure.am/) |
| **Code source** | [GitHub](https://github.com/we-promise/sure) |

## Installation

```sh
mithrandir install sure
```

Voir aussi [Actual Budget](./actualbudget) pour une alternative de gestion financière.

## Architecture

Sure fonctionne comme une stack multi-conteneurs :

| Conteneur | Description |
| --- | --- |
| `sure_web` | Application web Rails (port 3005) |
| `sure_worker` | Processeur de tâches en arrière-plan Sidekiq |
| `sure_postgres` | Base de données PostgreSQL 16 |
| `sure_redis` | Redis pour le cache et les files de tâches |

## Secrets

| Variable | Description |
| --- | --- |
| `SURE_SECRET_KEY_BASE` | Clé secrète Rails — générée automatiquement avec `openssl rand -hex 64` lors de l'installation |
| `SURE_DB_PASSWORD` | Mot de passe PostgreSQL (défaut : `sure_password`) |
| `SURE_OPENAI_ACCESS_TOKEN` | Clé API OpenAI pour les fonctionnalités alimentées par l'IA (optionnel) |
| `SURE_OPENAI_URI_BASE` | URL de base d'une API compatible OpenAI personnalisée (optionnel) |
| `SURE_OPENAI_MODEL` | Modèle OpenAI à utiliser (optionnel) |

Lorsque HTTPS est activé via Caddy, `RAILS_ASSUME_SSL` est automatiquement défini sur `true` pour que Sure gère correctement le trafic HTTPS derrière le reverse proxy.

## Configuration

- Ouvrez l'interface web à l'adresse `http://your-server:3005`
- Créez un compte et commencez à suivre vos finances

## Clients

Des applications mobiles sont en cours de développement pour iOS et Android mais ne sont pas encore terminées et disponibles.

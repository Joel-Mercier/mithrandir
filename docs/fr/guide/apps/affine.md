# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/affine.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> AFFiNE

Base de connaissances et espace de travail axé sur la confidentialité — une alternative open-source à Notion.

| | |
| --- | --- |
| **Image** | `ghcr.io/toeverything/affine:stable` |
| **Interface web** | `http://your-server:3010` |
| **Chemin de configuration** | `{BASE_DIR}/affine/config` |
| **Site web** | [affine.pro](https://affine.pro/) |
| **Code source** | [GitHub](https://github.com/toeverything/AFFiNE) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Medium — Moteur de base de connaissances |
| **Stockage** | Medium — Base de données PostgreSQL |

## Installation

```sh
mithrandir install affine
```

## Architecture

AFFiNE fonctionne comme une stack multi-conteneurs :

| Conteneur | Description |
| --- | --- |
| `affine_server` | Serveur applicatif principal AFFiNE (port 3010) |
| `affine_migration_job` | Tâche de migration de base de données (s'exécute une fois au démarrage) |
| `affine_postgres` | PostgreSQL 16 avec extension pgvector |
| `affine_redis` | Redis pour le cache et la gestion des sessions |

## Secrets

| Variable | Description |
| --- | --- |
| `AFFINE_DB_PASSWORD` | Mot de passe PostgreSQL (défaut : `affine`) |
| `AFFINE_DB_USERNAME` | Nom d'utilisateur PostgreSQL (défaut : `affine`) |

## Configuration

- Ouvrez l'interface web à l'adresse `http://your-server:3010`
- Créez un compte et commencez à utiliser AFFiNE

## Clients

Des clients mobiles pour AFFiNE sont disponibles pour [iOS](https://apps.apple.com/us/app/notes-whiteboard-ai-affine/id6736937980) et [Android](https://play.google.com/store/apps/details?id=app.affine.pro).

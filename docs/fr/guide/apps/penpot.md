# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/penpot.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Penpot

Plateforme open-source de design et prototypage — une alternative à Figma.

| | |
| --- | --- |
| **Image** | `penpotapp/frontend:latest` |
| **Interface web** | `http://your-server:9001` |
| **Chemin de configuration** | `{BASE_DIR}/penpot/postgres` |
| **Site web** | [penpot.app](https://penpot.app/) |
| **Code source** | [GitHub](https://github.com/penpot/penpot) |

## Installation

```sh
mithrandir install penpot
```

## Architecture

Penpot fonctionne comme une stack multi-conteneurs :

| Conteneur | Description |
| --- | --- |
| `penpot_frontend` | Application web frontend (port 9001) |
| `penpot_backend` | Serveur API backend |
| `penpot_exporter` | Service d'export pour le rendu |
| `penpot_postgres` | Base de données PostgreSQL 15 |
| `penpot_valkey` | Valkey (compatible Redis) pour le cache |
| `penpot_mailcatch` | Intercepteur de mails pour les notifications par email (port 1080) |

## Secrets

| Variable | Description |
| --- | --- |
| `PENPOT_SECRET_KEY` | Clé secrète pour la signature de session (générée automatiquement) |
| `PENPOT_DB_PASSWORD` | Mot de passe PostgreSQL (défaut : `penpot`) |
| `PENPOT_PUBLIC_URI` | URI publique de l'instance (défaut : `http://localhost:9001`) |

## Configuration

- Ouvrez l'interface web à l'adresse `http://your-server:9001`
- Créez un compte et commencez à designer

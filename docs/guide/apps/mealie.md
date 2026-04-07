# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/mealie.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Mealie

Self-hosted recipe manager and meal planner — organize recipes, plan meals, and generate shopping lists with a clean, modern interface.

| | |
| --- | --- |
| **Image** | `ghcr.io/mealie-recipes/mealie:latest` |
| **Web UI** | `http://your-server:9925` |
| **Config path** | `{BASE_DIR}/mealie/data` |
| **Website** | [mealie.io](https://docs.mealie.io/) |
| **Source code** | [GitHub](https://github.com/mealie-recipes/mealie) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — Lightweight recipe server |
| **Storage** | Low — PostgreSQL database for recipes |

## Installation

```sh
mithrandir install mealie
```

## Architecture

Mealie runs as a multi-container stack:

| Container | Description |
| --- | --- |
| `mealie` | Main Mealie application server (port 9925) |
| `mealie_postgres` | PostgreSQL 17 database |

## Secrets

| Variable | Description |
| --- | --- |
| `MEALIE_DB_PASSWORD` | PostgreSQL password (default: `mealie`) |

## Setup

- Open the web UI at `http://your-server:9925`
- The default credentials are `changeme@email.com` / `MyPassword`
- Change the default password immediately after first login
- Signups are disabled by default — create accounts from the admin panel

## Importing Recipes

Mealie can import recipes from URLs. Paste a link from any recipe website and Mealie will automatically extract the ingredients, instructions, and metadata.

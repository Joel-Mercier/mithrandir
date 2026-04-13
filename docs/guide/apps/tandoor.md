# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/tandoor-recipes.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Tandoor

Recipe manager and meal planner with shopping lists — organize recipes, plan meals, create shopping lists, and manage your cookbook collection.

| | |
| --- | --- |
| **Image** | `vabene1111/recipes:latest` |
| **Web UI** | `http://your-server:9010` |
| **Config path** | `{BASE_DIR}/tandoor/mediafiles` |
| **Website** | [docs.tandoor.dev](https://docs.tandoor.dev/) |
| **Source code** | [GitHub](https://github.com/TandoorRecipes/recipes) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — Lightweight recipe server |
| **Storage** | Low — PostgreSQL database for recipes |

## Installation

```sh
mithrandir install tandoor
```

## Architecture

Tandoor runs as a multi-container stack:

| Container | Description |
| --- | --- |
| `tandoor` | Main Tandoor application server (port 9010) |
| `tandoor_postgres` | PostgreSQL 16 database |

## Secrets

| Variable | Description |
| --- | --- |
| `TANDOOR_SECRET_KEY` | Django secret key (auto-generated during install) |
| `TANDOOR_DB_PASSWORD` | PostgreSQL password (default: `tandoor`) |

## Configuration

- When HTTPS is enabled, `ALLOWED_HOSTS` is automatically set to `tandoor.{your-domain}.duckdns.org`
- Without HTTPS, all hosts are allowed by default

## Setup

- Open the web UI at `http://your-server:9010`
- Create your admin account on first launch
- Start adding recipes manually or import them from URLs

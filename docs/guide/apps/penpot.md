# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/penpot.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Penpot

Open-source design and prototyping platform — an alternative to Figma.

| | |
| --- | --- |
| **Image** | `penpotapp/frontend:latest` |
| **Web UI** | `http://your-server:9001` |
| **Config path** | `{BASE_DIR}/penpot/postgres` |
| **Website** | [penpot.app](https://penpot.app/) |
| **Source code** | [GitHub](https://github.com/penpot/penpot) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Medium — Multiple services |
| **Storage** | Medium — Design assets |

## Installation

```sh
mithrandir install penpot
```

## Architecture

Penpot runs as a multi-container stack:

| Container | Description |
| --- | --- |
| `penpot_frontend` | Frontend web application (port 9001) |
| `penpot_backend` | Backend API server |
| `penpot_exporter` | Export service for rendering |
| `penpot_postgres` | PostgreSQL 15 database |
| `penpot_valkey` | Valkey (Redis-compatible) for caching |
| `penpot_mailcatch` | Mail catcher for email notifications (port 1080) |

## Secrets

| Variable | Description |
| --- | --- |
| `PENPOT_SECRET_KEY` | Secret key for session signing (auto-generated) |
| `PENPOT_DB_PASSWORD` | PostgreSQL password (default: `penpot`) |
| `PENPOT_PUBLIC_URI` | Public URI for the instance (default: `http://localhost:9001`) |

## Setup

- Open the web UI at `http://your-server:9001`
- Create an account and start designing
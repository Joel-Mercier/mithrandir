# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/sure-finance.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Sure

Privacy-focused personal finance tracker with multi-currency support, bank syncing, and budgeting tools.

| | |
| --- | --- |
| **Image** | `ghcr.io/we-promise/sure:stable` |
| **Web UI** | `http://your-server:3005` |
| **Config path** | `{BASE_DIR}/sure/postgres` |
| **Website** | [sure.am](https://sure.am/) |
| **Source code** | [GitHub](https://github.com/we-promise/sure) |

## Installation

```sh
mithrandir install sure
```

Also see [Actual Budget](./actualbudget) for an alternative finance app.

## Architecture

Sure runs as a multi-container stack:

| Container | Description |
| --- | --- |
| `sure_web` | Rails web application (port 3005) |
| `sure_worker` | Sidekiq background job processor |
| `sure_postgres` | PostgreSQL 16 database |
| `sure_redis` | Redis for caching and job queues |

## Secrets

| Variable | Description |
| --- | --- |
| `SURE_SECRET_KEY_BASE` | Rails secret key base — auto-generated with `openssl rand -hex 64` during install |
| `SURE_DB_PASSWORD` | PostgreSQL password (default: `sure_password`) |
| `SURE_OPENAI_ACCESS_TOKEN` | OpenAI API key for AI-powered features (optional) |
| `SURE_OPENAI_URI_BASE` | Custom OpenAI-compatible API base URL (optional) |
| `SURE_OPENAI_MODEL` | OpenAI model to use (optional) |

When HTTPS is enabled via Caddy, `RAILS_ASSUME_SSL` is automatically set to `true` so Sure correctly handles HTTPS traffic behind the reverse proxy.

## Setup

- Open the web UI at `http://your-server:3005`
- Create an account and start tracking your finances

## Clients

Mobile apps are being built for iOS and Android but are not yet finished and available.

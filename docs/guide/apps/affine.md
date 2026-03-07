# AFFiNE

Privacy-focused knowledge base and workspace — an open-source alternative to Notion.

| | |
| --- | --- |
| **Image** | `ghcr.io/toeverything/affine:stable` |
| **Web UI** | `http://your-server:3010` |
| **Config path** | `{BASE_DIR}/affine/config` |
| **Website** | [affine.pro](https://affine.pro/) |
| **Source code** | [GitHub](https://github.com/toeverything/AFFiNE) |

## Installation

```sh
mithrandir install affine
```

## Setup

1. Open the web UI at `http://your-server:3010`
2. Create an account and start using AFFiNE

## Architecture

AFFiNE runs as a multi-container stack:

| Container | Description |
| --- | --- |
| `affine_server` | Main AFFiNE application server (port 3010) |
| `affine_migration_job` | Database migration job (runs once on startup) |
| `affine_postgres` | PostgreSQL 16 with pgvector extension |
| `affine_redis` | Redis for caching and session management |

## Secrets

| Variable | Description |
| --- | --- |
| `AFFINE_DB_PASSWORD` | PostgreSQL password (default: `affine`) |
| `AFFINE_DB_USERNAME` | PostgreSQL username (default: `affine`) |

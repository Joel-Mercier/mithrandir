# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/adventurelog.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> AdventureLog

Travel planning and adventure journal — plan your trips, log your adventures, and keep track of the places you've visited.

| | |
| --- | --- |
| **Image** | `ghcr.io/seanmorley15/adventurelog-frontend:latest` |
| **Web UI** | `http://your-server:8015` |
| **API** | `http://your-server:8016` |
| **Config path** | `{BASE_DIR}/adventurelog/postgres` |
| **Website** | [adventurelog.app](https://adventurelog.app) |
| **Source code** | [GitHub](https://github.com/seanmorley15/AdventureLog) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Medium — Django + PostGIS |
| **Storage** | Medium — Adventure data |

## Installation

```sh
mithrandir install adventurelog
```

## Setup

During installation, you'll be prompted for:

| Secret | Required | Description |
| --- | --- | --- |
| `ADVENTURELOG_SECRET_KEY` | Yes | Django secret key (auto-generated) |
| `ADVENTURELOG_DB_PASSWORD` | No | Database password (default: `changeme123`) |
| `ADVENTURELOG_ADMIN_USERNAME` | No | Admin username (default: `admin`) |
| `ADVENTURELOG_ADMIN_PASSWORD` | No | Admin password (default: `admin`) |
| `ADVENTURELOG_ADMIN_EMAIL` | No | Admin email (default: `admin@example.com`) |

After installation, open `http://your-server:8015` and log in with the admin credentials you configured.

::: warning First startup may be slow
The backend container imports geographic data on first launch, which can take several minutes. The app will return errors until this process completes. You can monitor progress with:

```sh
mithrandir log adventurelog backend
```
:::

## Architecture

AdventureLog runs as three containers:

- **Frontend** — SvelteKit app on port 8015
- **Backend** — Django API on port 8016
- **Database** — PostGIS (PostgreSQL with spatial extensions) for location data

# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/hortusfox.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> HortusFox

Self-hosted plant management system — track your plants, manage watering schedules, log growth history, and organize your garden. HortusFox provides a web interface to catalog your plant collection with photos, care instructions, and health tracking.

| | |
| --- | --- |
| **Image** | `ghcr.io/danielbrendel/hortusfox-web:latest` |
| **Web UI** | `http://your-server:8089` |
| **Config path** | `{BASE_DIR}/hortusfox/db` |
| **Website** | [hortusfox.com](https://www.hortusfox.com/) |
| **Source code** | [GitHub](https://github.com/danielbrendel/hortusfox-web) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — Lightweight PHP app with MariaDB |
| **Storage** | Low — Plant data and photos |

## Installation

```sh
mithrandir install hortusfox
```

You will be prompted for:
- **Admin email** — used to log in to the web interface
- **Admin password** — initial admin account password

## Setup

After installation, open the web UI at `http://your-server:8089` and log in with the admin email and password you provided during installation.

## Architecture

HortusFox runs as two containers:
- **hortusfox_app** — PHP web application serving the UI on port 80 (mapped to 8089)
- **hortusfox_db** — MariaDB database storing plant data

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `HORTUSFOX_ADMIN_EMAIL` | Admin login email | `admin@example.com` |
| `HORTUSFOX_ADMIN_PASSWORD` | Admin login password | — |
| `HORTUSFOX_DB_PASSWORD` | MariaDB password | `hortusfox` |

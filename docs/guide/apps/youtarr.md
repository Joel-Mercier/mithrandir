# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/youtarr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Youtarr

YouTube video downloader and manager — automatically download videos from your favorite YouTube channels and playlists.

| | |
| --- | --- |
| **Image** | `dialmaster/youtarr:latest` |
| **Web UI** | `http://your-server:3087` |
| **Config path** | `{BASE_DIR}/youtarr/config` |
| **Website** | [GitHub](https://github.com/DialmasterOrg/Youtarr) |
| **Source code** | [GitHub](https://github.com/DialmasterOrg/Youtarr) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — YouTube downloader and manager |
| **Storage** | High — Stores downloaded video files |

## Installation

```sh
mithrandir install youtarr
```

## Architecture

Youtarr runs as a multi-container stack:

| Container | Description |
| --- | --- |
| `youtarr` | Main Youtarr application server (port 3087) |
| `youtarr_db` | MariaDB 10.3 database |

## Secrets

| Variable | Description |
| --- | --- |
| `YOUTARR_AUTH_USERNAME` | Admin username (required) |
| `YOUTARR_AUTH_PASSWORD` | Admin password (required) |
| `YOUTARR_DB_PASSWORD` | MariaDB password (default: `youtarr`) |

## Jellyfin Integration

Youtarr is compatible with [Jellyfin](./jellyfin). Downloaded videos are stored in `{BASE_DIR}/data/media/youtube`, so Jellyfin can automatically pick them up and add them to your media library.

## Setup

- Open the web UI at `http://your-server:3087`
- Log in with the username and password you set during installation
- Add YouTube channels or playlists to monitor
- Downloaded videos are stored in `{BASE_DIR}/data/media/youtube`

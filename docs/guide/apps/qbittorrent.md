# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/qbittorrent.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> qBittorrent

BitTorrent client with a web UI — used as the download client for Sonarr, Radarr, and Lidarr.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/qbittorrent:latest` |
| **Web UI** | `http://your-server:8080` |
| **Config path** | `{BASE_DIR}/qbittorrent/config` |
| **Data** | `{BASE_DIR}/data` (downloads and media) |
| **Website** | [qbittorrent.org](https://www.qbittorrent.org/) |
| **Source code** | [GitHub](https://github.com/qbittorrent/qBittorrent) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — Lightweight download client |
| **Storage** | High — Stores torrents and media files |

## Installation

```sh
mithrandir install qbittorrent
```

## Ports

| Port | Protocol | Description |
| --- | --- | --- |
| 8080 | TCP | Web UI |
| 6881 | TCP/UDP | BitTorrent traffic |

## Auto-Configuration

When installed via the setup wizard, qBittorrent is automatically configured with automatic torrent handling, downloads root path and adds authentication to the webUI.

## Setup

- Go to the qBittorrent webUI settings (cog icon).
- In the "Downloads" section, check "Delete .torrent files afterwards", set "Default Torrent Managing mode" to "Automatic", and set the "Default Save Path" to /data/downloads.
- In the "Web UI" section, change the default username and password.

An additional guide for qBittorrent is available [here (Trash Guides)](https://trash-guides.info/Downloaders/qBittorrent/Basic-Setup/) and here [here (Yams)](https://yams.media/config/qbittorrent/).


# qBittorrent

BitTorrent client with a web UI — used as the download client for Sonarr, Radarr, and Lidarr.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/qbittorrent:latest` |
| **Web UI** | `http://your-server:8080` |
| **Config path** | `{BASE_DIR}/qbittorrent/config` |
| **Data** | `{BASE_DIR}/data` (downloads and media) |

## Installation

```sh
sudo mithrandir install qbittorrent
```

## Ports

| Port | Protocol | Description |
| --- | --- | --- |
| 8080 | TCP | Web UI |
| 6881 | TCP/UDP | BitTorrent traffic |

## Setup

<!-- TODO: Add setup instructions with screenshots -->

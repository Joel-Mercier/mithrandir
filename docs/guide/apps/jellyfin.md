# Jellyfin

Free media streaming server — an open-source alternative to Plex and Emby.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/jellyfin:latest` |
| **Web UI** | `http://your-server:8096` |
| **Config path** | `{BASE_DIR}/jellyfin/config` |
| **Data** | `{BASE_DIR}/data` (read-only mount) |

## Installation

```sh
sudo mithrandir install jellyfin
```

## Ports

| Port | Protocol | Description |
| --- | --- | --- |
| 8096 | TCP | Web UI |
| 8920 | TCP | Client-to-client sync |
| 7359 | UDP | DLNA discovery |

## Setup

<!-- TODO: Add setup instructions with screenshots -->

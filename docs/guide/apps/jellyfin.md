# Jellyfin

Free media streaming server — an open-source alternative to Plex and Emby.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/jellyfin:latest` |
| **Web UI** | `http://your-server:8096` |
| **Config path** | `{BASE_DIR}/jellyfin/config` |
| **Data** | `{BASE_DIR}/data` (read-only mount) |
| **Website** | [jellyfin.org](https://jellyfin.org/) |
| **Source code** | [GitHub](https://github.com/jellyfin/jellyfin) |

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

## Auto-Configuration

When installed via the setup wizard, Jellyfin is automatically configured with the provided username and password. It also registers the preferred country and language settings and sets up the movies and series media libraries.

## Setup

Follow the onboarding wizard and setup your Jellyfin server.

An additional guide for Jellyfin is available [here (Yams)](https://yams.media/config/jellyfin/).

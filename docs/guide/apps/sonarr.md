# Sonarr

TV series collection manager — monitors for new episodes and automatically downloads them via your preferred download client.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/sonarr:latest` |
| **Web UI** | `http://your-server:8989` |
| **Config path** | `{BASE_DIR}/sonarr/config` |
| **Data** | `{BASE_DIR}/data` |
| **Website** | [sonarr.tv](https://sonarr.tv/) |
| **Source code** | [GitHub](https://github.com/Sonarr/Sonarr) |

## Installation

```sh
mithrandir install sonarr
```

## Auto-Configuration

When installed via the setup wizard, Sonarr is automatically configured with the provided username and password. It also registers qBittorrent as a download client and sets the root folder to /data/media/tv.

## Setup

- Go to the Sonarr webUI and set the authentication method to "Forms" and configure the username and password with the values you set during the setup wizard.
- In **Settings → Download Clients** add qBittorrent as a download client.
- In **Settings → Media Management** set the root folder to /data/media/tv.

Official Sonarr documentation is available [here](https://wiki.servarr.com/en/sonarr).

An additional guide for Sonarr is available [here (Trash Guides)](https://trash-guides.info/Sonarr/) and here [here (Yams)](https://yams.media/config/sonarr/).

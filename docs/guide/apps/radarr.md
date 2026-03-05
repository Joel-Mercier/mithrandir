# Radarr

Movie collection manager — automatically searches for, downloads, and organizes movies.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/radarr:latest` |
| **Web UI** | `http://your-server:7878` |
| **Config path** | `{BASE_DIR}/radarr/config` |
| **Data** | `{BASE_DIR}/data` |
| **Website** | [radarr.video](https://radarr.video/) |
| **Source code** | [GitHub](https://github.com/Radarr/Radarr) |

## Installation

```sh
sudo mithrandir install radarr
```

## Auto-Configuration

When installed via the setup wizard, Radarr is automatically configured with the provided username and password. It also registers qBittorrent as a download client and sets the root folder to /data/media/movies.

## Setup

- Go to the Radarr webUI and set the authentication method to "Forms" and configure the username and password with the values you set during the setup wizard.
- In **Settings → Download Clients** add qBittorrent as a download client.
- In **Settings → Media Management** set the root folder to /data/media/movies.

Official Radarr documentation is available [here](https://wiki.servarr.com/en/radarr).

An additional guide for Radarr is available [here (Trash Guides)](https://trash-guides.info/Radarr/) and here [here (Yams)](https://yams.media/config/radarr/).

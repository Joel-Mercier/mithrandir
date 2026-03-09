# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/lidarr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Lidarr

Music collection manager — automatically searches for and downloads music albums.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/lidarr:latest` |
| **Web UI** | `http://your-server:8686` |
| **Config path** | `{BASE_DIR}/lidarr/config` |
| **Data** | `{BASE_DIR}/data` |
| **Website** | [lidarr.audio](https://lidarr.audio/) |
| **Source code** | [GitHub](https://github.com/Lidarr/Lidarr) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — Background monitoring |
| **Storage** | Medium — Music database |

## Installation

```sh
mithrandir install lidarr
```

## Auto-Configuration

When installed via the setup wizard, Lidarr is automatically configured with the provided username and password. It also registers qBittorrent as a download client and sets the root folder to /data/media/music.

## Setup

- Go to the Lidarr webUI and set the authentication method to "Forms" and configure the username and password with the values you set during the setup wizard.
- In **Settings → Download Clients** add qBittorrent as a download client.
- In **Settings → Media Management** set the root folder to /data/media/music.

Official Lidarr documentation is available [here](https://wiki.servarr.com/en/lidarr).

# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/prowlarr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Prowlarr

Indexer manager for the *Arr stack — manages indexers in a single place and syncs them to Sonarr, Radarr, and Lidarr.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/prowlarr:latest` |
| **Web UI** | `http://your-server:9696` |
| **Config path** | `{BASE_DIR}/prowlarr/config` |
| **Website** | [prowlarr.com](https://prowlarr.com/) |
| **Source code** | [GitHub](https://github.com/Prowlarr/Prowlarr) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — Indexer proxy |
| **Storage** | Low — Minimal resources |

## Installation

```sh
mithrandir install prowlarr
```

Prowlarr automatically installs [Byparr](./byparr) as a companion service for bypassing Cloudflare-protected indexers. Older installs may have [FlareSolverr](./flaresolverr) instead; it keeps working and isn't removed.

## Auto-Configuration

When installed via the setup wizard, Prowlarr is automatically configured with the provided username and password. It also registers the *Arr stack as applications in Prowlarr (Sonarr, Radarr, Lidarr) and adds [Byparr](./byparr) as an indexer proxy named `Byparr` with the tag `byparr`.

::: warning
Do not set qBittorrent as the download client for in Prowlarr. This will be done in Radarr, Sonarr, and Lidarr directly.
:::

## Setup

- Go to the Prowlarr webUI and set the authentication method to "Forms" and configure the username and password with the values you set during the setup wizard.
- In **Settings → Apps** add Radarr, Sonarr and Lidarr as applications. The API keys for each app can be found in **Settings → General**.
- Some indexers are behind a Cloudflare captcha. The setup wizard and `mithrandir install byparr` already add a `Byparr` indexer proxy (in **Settings → Indexers**) with the tag `byparr`. Add the `byparr` tag to every indexer that requires a captcha. If the proxy is missing, see [Byparr](./byparr#setup-in-prowlarr) to add it manually or to switch an existing FlareSolverr proxy.
- Add indexers in order to be able to find torrents for the desired content.

Official Prowlarr documentation is available [here](https://wiki.servarr.com/en/prowlarr).

An additional guide for Prowlarr is available [here (Trash Guides)](https://trash-guides.info/Prowlarr/) and here [here (Yams)](https://yams.media/config/prowlarr/).
# Prowlarr

Indexer manager for the *Arr stack — manages indexers in a single place and syncs them to Sonarr, Radarr, and Lidarr.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/prowlarr:latest` |
| **Web UI** | `http://your-server:9696` |
| **Config path** | `{BASE_DIR}/prowlarr/config` |
| **Website** | [prowlarr.com](https://prowlarr.com/) |
| **Source code** | [GitHub](https://github.com/Prowlarr/Prowlarr) |

## Installation

```sh
sudo mithrandir install prowlarr
```

Prowlarr automatically installs [FlareSolverr](./flaresolverr) as a companion service for bypassing Cloudflare-protected indexers.

## Auto-Configuration

When installed via the setup wizard, Prowlarr is automatically configured with the provided username and password. It also registers the *Arr stack as applications in Prowlarr (Sonarr, Radarr, Lidarr).

::: warning
Do not set qBittorrent as the download client for in Prowlarr. This will be done in Radarr, Sonarr, and Lidarr directly.
:::

## Setup

- Go to the Prowlarr webUI and set the authentication method to "Forms" and configure the username and password with the values you set during the setup wizard.
- In **Settings → Apps** add Radarr, Sonarr and Lidarr as applications. The API keys for each app can be found in **Settings → General**.
- Some indexers are behind a Cloudflare captcha. To bypass this, go to **Settings → Indexers**, click the "+" sign and set the indexer proxy to `FlareSolverr`. Add name `Flaresolverr`, tag `flaresolverr` and url `http://<local ip>:8191`. Then for every indexer that requires a captcha, add the `flaresolverr` tag to the indexer.
- Add indexers in order to be able to find torrents for the desired content.

Official Prowlarr documentation is available [here](https://wiki.servarr.com/en/prowlarr).

An additional guide for Prowlarr is available [here (Trash Guides)](https://trash-guides.info/Prowlarr/) and here [here (Yams)](https://yams.media/config/prowlarr/).
# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/bazarr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Bazarr

Subtitle manager — automatically downloads subtitles for your Sonarr and Radarr libraries.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/bazarr:latest` |
| **Web UI** | `http://your-server:6767` |
| **Config path** | `{BASE_DIR}/bazarr/config` |
| **Data** | `{BASE_DIR}/data` |
| **Website** | [bazarr.media](https://bazarr.media/) |
| **Source code** | [GitHub](https://github.com/morpheus65535/bazarr) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — Subtitle fetching |
| **Storage** | Low — Minimal resources |

## Installation

```sh
mithrandir install bazarr
```

## Setup

- Go to the Bazarr webUI and set the authentication method to "Forms" and configure the username and password with the values you set during the setup wizard.
- Add a new language profile in **Settings → Languages** with the desired language.
- Set this new profile as the default for movies and series and save.
- In **Settings → Providers** add the desired subtitle providers and save.
- In **Settings → Sonarr** connect your Sonarr server with the api key found in Sonarr under **Settings → General**.
- In **Settings → Radarr** connect your Radarr server with the api key found in Radarr under **Settings → General**.

An additional guide for Bazarr is available [here (Yams)](https://yams.media/config/bazarr/).
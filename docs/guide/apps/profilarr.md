# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/profilarr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Profilarr

Import, sync, and manage quality profiles for Radarr and Sonarr.

| | |
| --- | --- |
| **Image** | `santiagosayshey/profilarr:latest` |
| **Web UI** | `http://your-server:6868` |
| **Config path** | `{BASE_DIR}/profilarr/config` |
| **Website** | [dictionarry.dev](https://dictionarry.dev/) |
| **Source code** | [GitHub](https://github.com/Dictionarry-Hub/profilarr) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — Sync utility |
| **Storage** | Low — Profile data |

## Installation

```sh
mithrandir install profilarr
```

Or as part of the Movies & TV stack:

```sh
mithrandir install media-movies-tv
```

## Setup

Profilarr provides a web UI for managing quality profiles. Connect it to your Radarr and/or Sonarr instances to sync and manage profiles across them.

- Open the Profilarr web UI at `http://your-server:6868`
- Add your Radarr and/or Sonarr instances with their API keys
- Import or create quality profiles and sync them to your *Arr apps

You can find the complete guide and documentation for Profilarr [here](https://dictionarry.dev/).

# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/glance.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Glance

Self-hosted dashboard with various widgets — weather, bookmarks, RSS feeds, calendar, and more.

| | |
| --- | --- |
| **Image** | `glanceapp/glance:latest` |
| **Web UI** | `http://your-server:8082` |
| **Config path** | `{BASE_DIR}/glance/config` |
| **Website** | [GitHub Docs](https://github.com/glanceapp/glance/tree/main/docs) |
| **Source code** | [GitHub](https://github.com/glanceapp/glance) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — Lightweight dashboard |
| **Storage** | Low — Configuration only |

## Installation

```sh
mithrandir install glance
```

## Setup

Create a `glance.yml` configuration file in `{BASE_DIR}/glance/config/` to define your dashboard pages and widgets. See the [Glance documentation](https://github.com/glanceapp/glance/tree/main/docs) for configuration options.

# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/audiobookshelf.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Audiobookshelf

Self-hosted audiobook and podcast server — stream your audiobook and podcast library from anywhere.

| | |
| --- | --- |
| **Image** | `ghcr.io/advplyr/audiobookshelf:latest` |
| **Web UI** | `http://your-server:13378` |
| **Config path** | `{BASE_DIR}/audiobookshelf/config` |
| **Metadata path** | `{BASE_DIR}/audiobookshelf/metadata` |
| **Website** | [audiobookshelf.org](https://www.audiobookshelf.org/) |
| **Source code** | [GitHub](https://github.com/advplyr/audiobookshelf) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — Audiobook and podcast streaming |
| **Storage** | Medium — Stores metadata and cover images |

## Installation

```sh
mithrandir install audiobookshelf
```

## Setup

- Audiobookshelf reads audiobooks from `{BASE_DIR}/data/media/audiobooks` and podcasts from `{BASE_DIR}/data/media/podcasts`.
- Go to the Audiobookshelf web UI and create your admin user.
- Add your audiobook library pointing to `/audiobooks` and your podcast library pointing to `/podcasts`.

## Clients

### Mobile

*Android*

- [Audiobookshelf Android app](https://play.google.com/store/apps/details?id=com.audiobookshelf.app)

*iOS*

- [Audiobookshelf iOS app (beta)](https://testflight.apple.com/join/wiic7QIW)

Official documentation is available [here](https://www.audiobookshelf.org/docs).

# Navidrome

Modern music server and streamer — compatible with Subsonic clients (DSub, Symphonium, etc.).

| | |
| --- | --- |
| **Image** | `deluan/navidrome:latest` |
| **Web UI** | `http://your-server:4533` |
| **Config path** | `{BASE_DIR}/navidrome/data` |

## Installation

```sh
sudo mithrandir install navidrome
```

## Optional Secrets

| Variable | Description |
| --- | --- |
| `ND_SPOTIFY_ID` | Spotify client ID for fetching artist images |
| `ND_SPOTIFY_SECRET` | Spotify client secret |

These are optional — Navidrome works without them, but artist images won't be fetched from Spotify.

## Setup

<!-- TODO: Add setup instructions with screenshots -->

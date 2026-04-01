# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/navidrome.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Navidrome

Modern music server and streamer — compatible with Subsonic clients (DSub, Symphonium, etc.).

| | |
| --- | --- |
| **Image** | `deluan/navidrome:latest` |
| **Web UI** | `http://your-server:4533` |
| **Config path** | `{BASE_DIR}/navidrome/data` |
| **Website** | [navidrome.org](https://navidrome.org/) |
| **Source code** | [GitHub](https://github.com/navidrome/navidrome) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — Music streaming |
| **Storage** | Low — Reads existing files |

## Installation

```sh
mithrandir install navidrome
```

## Setup

- Navidrome is setup to read files from `{BASE_DIR}/data/media/music`.
- Go to the Navidrome webUI and create your admin user.
- For an optimal experience, the audio files in your music library should be containing the most metadata possible. You can use [MusicBrainz Picard](https://picard.musicbrainz.org/) to add metadata to your files.

## Clients

Some good clients for Navidrome are:

### Desktop

- [feishin](https://github.com/jeffvli/feishin)

### Mobile

*Android*

- [Symfonium](https://symfonium.app/)

*iOS*

- [Arpeggi (still in beta)](https://testflight.apple.com/join/LDWqgjAs)

You can find the full list of apps [here](https://www.navidrome.org/apps/).
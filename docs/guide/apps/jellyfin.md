# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/jellyfin.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Jellyfin

Free media streaming server — an open-source alternative to Plex and Emby.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/jellyfin:latest` |
| **Web UI** | `http://your-server:8096` |
| **Config path** | `{BASE_DIR}/jellyfin/config` |
| **Data** | `{BASE_DIR}/data` (read-only mount) |
| **Website** | [jellyfin.org](https://jellyfin.org/) |
| **Source code** | [GitHub](https://github.com/jellyfin/jellyfin) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | High — Media transcoding |
| **Storage** | High — Large media libraries |

## Installation

```sh
mithrandir install jellyfin
```

## Ports

| Port | Protocol | Description |
| --- | --- | --- |
| 8096 | TCP | Web UI |
| 8920 | TCP | Client-to-client sync |
| 7359 | UDP | DLNA discovery |

## Auto-Configuration

When installed via the setup wizard, Jellyfin is automatically configured with the provided username and password. It also registers the preferred country and language settings and sets up the movies and series media libraries.

## Setup

Follow the onboarding wizard and setup your Jellyfin server.

An additional guide for Jellyfin is available [here (Yams)](https://yams.media/config/jellyfin/).

## Clients

Some good clients for Jellyfin are:

- The official clients for [Android](https://play.google.com/store/apps/details?id=org.jellyfin.mobile), [iOS](https://apps.apple.com/us/app/jellyfin-mobile/id1480192618) and [AndroidTV](https://play.google.com/store/apps/details?id=org.jellyfin.androidtv) (also available for [Fire TV](https://www.amazon.com/gp/aw/d/B07TX7Z725))
- [Wholphin (AndroidTV)](https://github.com/damontecres/Wholphin) - integrates Seerr support, available on the [Google Play Store](https://play.google.com/store/apps/details?id=com.github.damontecres.wholphin)
- [Moonfin (AndroidTV)](https://github.com/Moonfin-Client/AndroidTV-FireTV) - has Seerr support, available on the [Google Play Store](https://play.google.com/store/apps/details?id=org.moonfin.androidtv)

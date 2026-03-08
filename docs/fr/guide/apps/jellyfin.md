# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/jellyfin.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Jellyfin

Serveur de streaming multimédia gratuit — une alternative open-source à Plex et Emby.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/jellyfin:latest` |
| **Interface web** | `http://your-server:8096` |
| **Chemin de configuration** | `{BASE_DIR}/jellyfin/config` |
| **Données** | `{BASE_DIR}/data` (montage en lecture seule) |
| **Site web** | [jellyfin.org](https://jellyfin.org/) |
| **Code source** | [GitHub](https://github.com/jellyfin/jellyfin) |

## Installation

```sh
mithrandir install jellyfin
```

## Ports

| Port | Protocole | Description |
| --- | --- | --- |
| 8096 | TCP | Interface web |
| 8920 | TCP | Synchronisation client-à-client |
| 7359 | UDP | Découverte DLNA |

## Configuration automatique

Lorsqu'il est installé via l'assistant de configuration, Jellyfin est automatiquement configuré avec le nom d'utilisateur et le mot de passe fournis. Il enregistre également les paramètres de pays et de langue préférés et configure les bibliothèques multimédia de films et de séries.

## Configuration

Suivez l'assistant d'intégration et configurez votre serveur Jellyfin.

Un guide supplémentaire pour Jellyfin est disponible [ici (Yams)](https://yams.media/config/jellyfin/).

## Clients

Quelques bons clients pour Jellyfin :

- Les clients officiels pour [Android](https://play.google.com/store/apps/details?id=org.jellyfin.mobile), [iOS](https://apps.apple.com/us/app/jellyfin-mobile/id1480192618) et [AndroidTV](https://play.google.com/store/apps/details?id=org.jellyfin.androidtv) (également disponible pour [Fire TV](https://www.amazon.com/gp/aw/d/B07TX7Z725))
- [Wholphin (AndroidTV)](https://github.com/damontecres/Wholphin) - intègre le support de Seerr
- [Moonfin (AndroidTV)](https://github.com/Moonfin-Client/AndroidTV-FireTV) - supporte Seerr mais pas encore disponible sur le Play Store, il faut installer l'APK manuellement.

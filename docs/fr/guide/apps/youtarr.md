# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/youtarr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Youtarr

Gestionnaire et telechargeur de videos YouTube — telechargez automatiquement les videos de vos chaines et playlists YouTube preferees.

| | |
| --- | --- |
| **Image** | `dialmaster/youtarr:latest` |
| **Interface web** | `http://your-server:3087` |
| **Chemin de configuration** | `{BASE_DIR}/youtarr/config` |
| **Site web** | [GitHub](https://github.com/DialmasterOrg/Youtarr) |
| **Code source** | [GitHub](https://github.com/DialmasterOrg/Youtarr) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Gestionnaire et telechargeur YouTube |
| **Stockage** | High — Stocke les fichiers video telecharges |

## Installation

```sh
mithrandir install youtarr
```

## Architecture

Youtarr fonctionne comme une stack multi-conteneurs :

| Conteneur | Description |
| --- | --- |
| `youtarr` | Serveur applicatif principal Youtarr (port 3087) |
| `youtarr_db` | Base de donnees MariaDB 10.3 |

## Secrets

| Variable | Description |
| --- | --- |
| `YOUTARR_AUTH_USERNAME` | Nom d'utilisateur administrateur (requis) |
| `YOUTARR_AUTH_PASSWORD` | Mot de passe administrateur (requis) |
| `YOUTARR_DB_PASSWORD` | Mot de passe MariaDB (defaut : `youtarr`) |

## Integration Jellyfin

Youtarr est compatible avec [Jellyfin](./jellyfin). Les videos telechargees sont stockees dans `{BASE_DIR}/data/media/youtube`, ce qui permet a Jellyfin de les detecter automatiquement et de les ajouter a votre bibliotheque multimedia.

## Configuration

- Ouvrez l'interface web a l'adresse `http://your-server:3087`
- Connectez-vous avec le nom d'utilisateur et le mot de passe definis lors de l'installation
- Ajoutez des chaines ou playlists YouTube a surveiller
- Les videos telechargees sont stockees dans `{BASE_DIR}/data/media/youtube`

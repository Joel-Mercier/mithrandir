# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/audiobookshelf.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Audiobookshelf

Serveur de livres audio et podcasts auto-hébergé — diffusez votre bibliothèque de livres audio et podcasts depuis n'importe où.

| | |
| --- | --- |
| **Image** | `ghcr.io/advplyr/audiobookshelf:latest` |
| **Interface web** | `http://your-server:13378` |
| **Chemin de configuration** | `{BASE_DIR}/audiobookshelf/config` |
| **Chemin des métadonnées** | `{BASE_DIR}/audiobookshelf/metadata` |
| **Site web** | [audiobookshelf.org](https://www.audiobookshelf.org/) |
| **Code source** | [GitHub](https://github.com/advplyr/audiobookshelf) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Streaming de livres audio et podcasts |
| **Stockage** | Medium — Stocke les métadonnées et les couvertures |

## Installation

```sh
mithrandir install audiobookshelf
```

## Configuration

- Audiobookshelf lit les livres audio depuis `{BASE_DIR}/data/media/audiobooks` et les podcasts depuis `{BASE_DIR}/data/media/podcasts`.
- Allez dans l'interface web d'Audiobookshelf et créez votre utilisateur administrateur.
- Ajoutez votre bibliothèque de livres audio pointant vers `/audiobooks` et votre bibliothèque de podcasts pointant vers `/podcasts`.

## Clients

### Mobile

*Android*

- [Application Android Audiobookshelf](https://play.google.com/store/apps/details?id=com.audiobookshelf.app)

*iOS*

- [Application iOS Audiobookshelf (beta)](https://testflight.apple.com/join/wiic7QIW)

La documentation officielle est disponible [ici](https://www.audiobookshelf.org/docs).

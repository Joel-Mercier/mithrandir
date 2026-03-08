# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/navidrome.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Navidrome

Serveur et lecteur de musique moderne — compatible avec les clients Subsonic (DSub, Symphonium, etc.).

| | |
| --- | --- |
| **Image** | `deluan/navidrome:latest` |
| **Interface web** | `http://your-server:4533` |
| **Chemin de configuration** | `{BASE_DIR}/navidrome/data` |
| **Site web** | [navidrome.org](https://navidrome.org/) |
| **Code source** | [GitHub](https://github.com/navidrome/navidrome) |

## Installation

```sh
mithrandir install navidrome
```

## Secrets optionnels

| Variable | Description |
| --- | --- |
| `ND_SPOTIFY_ID` | Identifiant client Spotify pour récupérer les images d'artistes |
| `ND_SPOTIFY_SECRET` | Secret client Spotify |

Ces variables sont optionnelles — Navidrome fonctionne sans elles, mais les images d'artistes ne seront pas récupérées depuis Spotify.

## Configuration

- Navidrome est configuré pour lire les fichiers depuis `{BASE_DIR}/data/media/music`.
- Allez dans l'interface web de Navidrome et créez votre utilisateur administrateur.
- Pour une expérience optimale, les fichiers audio de votre bibliothèque musicale doivent contenir le plus de métadonnées possible. Vous pouvez utiliser [MusicBrainz Picard](https://picard.musicbrainz.org/) pour ajouter des métadonnées à vos fichiers.

## Clients

Quelques bons clients pour Navidrome :

### Bureau

- [feishin](https://github.com/jeffvli/feishin)

### Mobile

*Android*

- [Symfonium](https://symfonium.app/)

*iOS*

- [Arpeggi (encore en bêta)](https://testflight.apple.com/join/LDWqgjAs)

Vous pouvez trouver la liste complète des applications [ici](https://www.navidrome.org/apps/).

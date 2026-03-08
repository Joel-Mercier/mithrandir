# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/lidarr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Lidarr

Gestionnaire de collection musicale — recherche et télécharge automatiquement les albums de musique.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/lidarr:latest` |
| **Interface web** | `http://your-server:8686` |
| **Chemin de configuration** | `{BASE_DIR}/lidarr/config` |
| **Données** | `{BASE_DIR}/data` |
| **Site web** | [lidarr.audio](https://lidarr.audio/) |
| **Code source** | [GitHub](https://github.com/Lidarr/Lidarr) |

## Installation

```sh
mithrandir install lidarr
```

## Configuration automatique

Lorsqu'il est installé via l'assistant de configuration, Lidarr est automatiquement configuré avec le nom d'utilisateur et le mot de passe fournis. Il enregistre également qBittorrent comme client de téléchargement et définit le dossier racine sur /data/media/music.

## Configuration

- Allez dans l'interface web de Lidarr et définissez la méthode d'authentification sur "Forms", puis configurez le nom d'utilisateur et le mot de passe avec les valeurs définies lors de l'assistant de configuration.
- Dans **Settings → Download Clients**, ajoutez qBittorrent comme client de téléchargement.
- Dans **Settings → Media Management**, définissez le dossier racine sur /data/media/music.

La documentation officielle de Lidarr est disponible [ici](https://wiki.servarr.com/en/lidarr).

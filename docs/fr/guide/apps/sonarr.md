# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/sonarr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Sonarr

Gestionnaire de collection de séries TV — surveille les nouveaux épisodes et les télécharge automatiquement via votre client de téléchargement préféré.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/sonarr:latest` |
| **Interface web** | `http://your-server:8989` |
| **Chemin de configuration** | `{BASE_DIR}/sonarr/config` |
| **Données** | `{BASE_DIR}/data` |
| **Site web** | [sonarr.tv](https://sonarr.tv/) |
| **Code source** | [GitHub](https://github.com/Sonarr/Sonarr) |

## Installation

```sh
mithrandir install sonarr
```

## Configuration automatique

Lorsqu'il est installé via l'assistant de configuration, Sonarr est automatiquement configuré avec le nom d'utilisateur et le mot de passe fournis. Il enregistre également qBittorrent comme client de téléchargement et définit le dossier racine sur /data/media/tv.

## Configuration

- Allez dans l'interface web de Sonarr et définissez la méthode d'authentification sur "Forms", puis configurez le nom d'utilisateur et le mot de passe avec les valeurs définies lors de l'assistant de configuration.
- Dans **Settings → Download Clients**, ajoutez qBittorrent comme client de téléchargement.
- Dans **Settings → Media Management**, définissez le dossier racine sur /data/media/tv.

La documentation officielle de Sonarr est disponible [ici](https://wiki.servarr.com/en/sonarr).

Un guide supplémentaire pour Sonarr est disponible [ici (Trash Guides)](https://trash-guides.info/Sonarr/) et ici [ici (Yams)](https://yams.media/config/sonarr/).

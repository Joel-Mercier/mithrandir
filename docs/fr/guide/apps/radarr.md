# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/radarr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Radarr

Gestionnaire de collection de films — recherche, télécharge et organise automatiquement les films.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/radarr:latest` |
| **Interface web** | `http://your-server:7878` |
| **Chemin de configuration** | `{BASE_DIR}/radarr/config` |
| **Données** | `{BASE_DIR}/data` |
| **Site web** | [radarr.video](https://radarr.video/) |
| **Code source** | [GitHub](https://github.com/Radarr/Radarr) |

## Installation

```sh
mithrandir install radarr
```

## Configuration automatique

Lorsqu'il est installé via l'assistant de configuration, Radarr est automatiquement configuré avec le nom d'utilisateur et le mot de passe fournis. Il enregistre également qBittorrent comme client de téléchargement et définit le dossier racine sur /data/media/movies.

## Configuration

- Allez dans l'interface web de Radarr et définissez la méthode d'authentification sur "Forms", puis configurez le nom d'utilisateur et le mot de passe avec les valeurs définies lors de l'assistant de configuration.
- Dans **Settings → Download Clients**, ajoutez qBittorrent comme client de téléchargement.
- Dans **Settings → Media Management**, définissez le dossier racine sur /data/media/movies.

La documentation officielle de Radarr est disponible [ici](https://wiki.servarr.com/en/radarr).

Un guide supplémentaire pour Radarr est disponible [ici (Trash Guides)](https://trash-guides.info/Radarr/) et ici [ici (Yams)](https://yams.media/config/radarr/).

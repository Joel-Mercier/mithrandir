# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/qbittorrent.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> qBittorrent

Client BitTorrent avec interface web — utilisé comme client de téléchargement pour Sonarr, Radarr et Lidarr.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/qbittorrent:latest` |
| **Interface web** | `http://your-server:8080` |
| **Chemin de configuration** | `{BASE_DIR}/qbittorrent/config` |
| **Données** | `{BASE_DIR}/data` (téléchargements et média) |
| **Site web** | [qbittorrent.org](https://www.qbittorrent.org/) |
| **Code source** | [GitHub](https://github.com/qbittorrent/qBittorrent) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Client de téléchargement léger |
| **Stockage** | High — Stocke les torrents et les fichiers multimédia |

## Installation

```sh
mithrandir install qbittorrent
```

## Ports

| Port | Protocole | Description |
| --- | --- | --- |
| 8080 | TCP | Interface web |
| 6881 | TCP/UDP | Trafic BitTorrent |

## Configuration automatique

Lorsqu'il est installé via l'assistant de configuration, qBittorrent est automatiquement configuré avec la gestion automatique des torrents, le chemin racine des téléchargements et l'ajout de l'authentification à l'interface web.

## Configuration

- Allez dans les paramètres de l'interface web de qBittorrent (icône engrenage).
- Dans la section "Downloads", cochez "Delete .torrent files afterwards", définissez "Default Torrent Managing mode" sur "Automatic" et définissez le "Default Save Path" sur /data/downloads.
- Dans la section "Web UI", changez le nom d'utilisateur et le mot de passe par défaut.

Un guide supplémentaire pour qBittorrent est disponible [ici (Trash Guides)](https://trash-guides.info/Downloaders/qBittorrent/Basic-Setup/) et ici [ici (Yams)](https://yams.media/config/qbittorrent/).

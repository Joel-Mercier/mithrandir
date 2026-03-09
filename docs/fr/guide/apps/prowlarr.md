# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/prowlarr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Prowlarr

Gestionnaire d'indexeurs pour la stack *Arr — gère les indexeurs en un seul endroit et les synchronise avec Sonarr, Radarr et Lidarr.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/prowlarr:latest` |
| **Interface web** | `http://your-server:9696` |
| **Chemin de configuration** | `{BASE_DIR}/prowlarr/config` |
| **Site web** | [prowlarr.com](https://prowlarr.com/) |
| **Code source** | [GitHub](https://github.com/Prowlarr/Prowlarr) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Proxy d'indexeurs |
| **Stockage** | Low — Ressources minimales |

## Installation

```sh
mithrandir install prowlarr
```

Prowlarr installe automatiquement [FlareSolverr](./flaresolverr) comme service compagnon pour contourner les indexeurs protégés par Cloudflare.

## Configuration automatique

Lorsqu'il est installé via l'assistant de configuration, Prowlarr est automatiquement configuré avec le nom d'utilisateur et le mot de passe fournis. Il enregistre également la stack *Arr comme applications dans Prowlarr (Sonarr, Radarr, Lidarr).

::: warning
Ne définissez pas qBittorrent comme client de téléchargement dans Prowlarr. Cela sera fait directement dans Radarr, Sonarr et Lidarr.
:::

## Configuration

- Allez dans l'interface web de Prowlarr et définissez la méthode d'authentification sur "Forms", puis configurez le nom d'utilisateur et le mot de passe avec les valeurs définies lors de l'assistant de configuration.
- Dans **Settings → Apps**, ajoutez Radarr, Sonarr et Lidarr comme applications. Les clés API de chaque application se trouvent dans **Settings → General**.
- Certains indexeurs sont derrière un captcha Cloudflare. Pour le contourner, allez dans **Settings → Indexers**, cliquez sur le signe "+" et définissez le proxy de l'indexeur sur `FlareSolverr`. Ajoutez le nom `Flaresolverr`, le tag `flaresolverr` et l'URL `http://<local ip>:8191`. Ensuite, pour chaque indexeur nécessitant un captcha, ajoutez le tag `flaresolverr` à l'indexeur.
- Ajoutez des indexeurs pour pouvoir trouver des torrents pour le contenu souhaité.

La documentation officielle de Prowlarr est disponible [ici](https://wiki.servarr.com/en/prowlarr).

Un guide supplémentaire pour Prowlarr est disponible [ici (Trash Guides)](https://trash-guides.info/Prowlarr/) et ici [ici (Yams)](https://yams.media/config/prowlarr/).

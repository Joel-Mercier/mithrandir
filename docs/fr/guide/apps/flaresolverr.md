# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/flaresolverr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> FlareSolverr

Serveur proxy pour contourner la protection Cloudflare — utilisé par Prowlarr pour accéder aux indexeurs protégés par Cloudflare.

| | |
| --- | --- |
| **Image** | `ghcr.io/flaresolverr/flaresolverr:latest` |
| **Port** | 8191 |
| **Chemin de configuration** | `{BASE_DIR}/flaresolverr/config` |
| **Code source** | [GitHub](https://github.com/flaresolverr/flaresolverr) |

## Installation

FlareSolverr est installé automatiquement en tant que compagnon de [Prowlarr](./prowlarr). Vous n'avez pas besoin de l'installer séparément.

## Notes

- Il s'agit d'une application masquée — elle n'apparaît pas dans la sélection d'applications de l'assistant de configuration
- Elle est incluse dans les sauvegardes et les vérifications d'état comme toute autre application

# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/profilarr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Profilarr

Importez, synchronisez et gérez les profils de qualité pour Radarr et Sonarr.

| | |
| --- | --- |
| **Image** | `santiagosayshey/profilarr:latest` |
| **Interface web** | `http://your-server:6868` |
| **Chemin de configuration** | `{BASE_DIR}/profilarr/config` |
| **Site web** | [dictionarry.dev](https://dictionarry.dev/) |
| **Code source** | [GitHub](https://github.com/Dictionarry-Hub/profilarr) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Utilitaire de synchronisation |
| **Stockage** | Low — Données de profils |

## Installation

```sh
mithrandir install profilarr
```

Ou dans le cadre de la stack Films & Séries TV :

```sh
mithrandir install media-movies-tv
```

## Configuration

Profilarr fournit une interface web pour gérer les profils de qualité. Connectez-le à vos instances Radarr et/ou Sonarr pour synchroniser et gérer les profils entre elles.

- Ouvrez l'interface web de Profilarr à l'adresse `http://your-server:6868`
- Ajoutez vos instances Radarr et/ou Sonarr avec leurs clés API
- Importez ou créez des profils de qualité et synchronisez-les avec vos applications *Arr

Vous pouvez trouver le guide complet et la documentation de Profilarr [ici](https://dictionarry.dev/).

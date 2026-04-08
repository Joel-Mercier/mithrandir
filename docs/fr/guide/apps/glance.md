# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/glance.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Glance

Tableau de bord auto-hébergé avec divers widgets — météo, signets, flux RSS, calendrier et plus encore.

| | |
| --- | --- |
| **Image** | `glanceapp/glance:latest` |
| **Interface web** | `http://your-server:8082` |
| **Chemin de configuration** | `{BASE_DIR}/glance/config` |
| **Site web** | [glanceapp.github.io/glance](https://glanceapp.github.io/glance/) |
| **Code source** | [GitHub](https://github.com/glanceapp/glance) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Tableau de bord léger |
| **Stockage** | Low — Configuration uniquement |

## Installation

```sh
mithrandir install glance
```

## Configuration

Créez un fichier de configuration `glance.yml` dans `{BASE_DIR}/glance/config/` pour définir vos pages et widgets. Consultez la [documentation Glance](https://glanceapp.github.io/glance/) pour les options de configuration.

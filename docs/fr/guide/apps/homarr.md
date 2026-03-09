# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/homarr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Homarr

Tableau de bord serveur personnalisable — une belle page d'accueil pour tous vos services auto-hébergés avec des indicateurs d'état en temps réel.

| | |
| --- | --- |
| **Image** | `ghcr.io/ajnart/homarr:latest` |
| **Interface web** | `http://your-server:7575` |
| **Chemins de configuration** | `{BASE_DIR}/homarr/configs`, `{BASE_DIR}/homarr/icons`, `{BASE_DIR}/homarr/data` |
| **Site web** | [homarr.vercel.app](https://homarr.vercel.app/) |
| **Code source** | [GitHub](https://github.com/ajnart/homarr) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Tableau de bord statique |
| **Stockage** | Low — Contenu principalement statique |

## Installation

```sh
mithrandir install homarr
```

## Notes

- Homarr possède trois répertoires de configuration séparés (configs, icons, data) — tous sont sauvegardés
- Monte le socket Docker pour la gestion des conteneurs directement depuis le tableau de bord

## Configuration

Suivez l'assistant d'intégration et créez un tableau de bord.

# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/memos.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Memos

Hub de mémos auto-hébergé léger et gestion des connaissances — capturez vos idées, notes et extraits de connaissances avec une interface épurée et axée sur la confidentialité.

| | |
| --- | --- |
| **Image** | `neosmemo/memos:stable` |
| **Interface web** | `http://your-server:5230` |
| **Chemin de configuration** | `{BASE_DIR}/memos/data` |
| **Site web** | [usememos.com](https://usememos.com/) |
| **Code source** | [GitHub](https://github.com/usememos/memos) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Serveur de mémos léger |
| **Stockage** | Low — Base de données SQLite pour les mémos |

## Installation

```sh
mithrandir install memos
```

## Configuration

- Ouvrez l'interface web à l'adresse `http://your-server:5230`
- Créez votre compte administrateur au premier lancement
- Commencez à capturer des mémos, notes et idées

## Fonctionnalités

- Support Markdown avec édition riche
- Tags et filtres pour organiser les mémos
- API REST pour les intégrations
- Stockage léger SQLite

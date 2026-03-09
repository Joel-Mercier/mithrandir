# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/immich.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Immich

Gestion auto-hébergée de photos et vidéos — une alternative à Google Photos avec recherche alimentée par l'IA, reconnaissance faciale et applications mobiles.

| | |
| --- | --- |
| **Image** | `ghcr.io/immich-app/immich-server:release` |
| **Interface web** | `http://your-server:2283` |
| **Chemin de configuration** | `{BASE_DIR}/immich/postgres` |
| **Données** | `{BASE_DIR}/data/media/pictures` |
| **Site web** | [immich.app](https://immich.app/) |
| **Code source** | [GitHub](https://github.com/immich-app/immich) |
| **Application Android** | [Play Store](https://play.google.com/store/apps/details?id=app.alextran.immich) |
| **Application iOS** | [App Store](https://apps.apple.com/us/app/immich/id1613945652) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | High — Traitement ML pour la détection de visages et la recherche |
| **Stockage** | High — Stocke toutes les photos et vidéos |

## Installation

```sh
mithrandir install immich
```

## Architecture

Immich est une application multi-conteneurs composée de :

- **immich_server** — Serveur applicatif principal
- **immich_machine_learning** — Traitement IA/ML (détection de visages, recherche, etc.)
- **immich_redis** — Couche de cache
- **immich_postgres** — Base de données PostgreSQL avec extensions vectorielles

## Secrets optionnels

| Variable | Défaut | Description |
| --- | --- | --- |
| `IMMICH_DB_PASSWORD` | `postgres` | Mot de passe de la base de données PostgreSQL |

## Configuration

Complétez l'assistant d'intégration et configurez vos photos et vidéos.

## Clients

Utilisez les clients officiels [Android](https://play.google.com/store/apps/details?id=app.alextran.immich) ou [iOS](https://apps.apple.com/us/app/immich/id1613945652).

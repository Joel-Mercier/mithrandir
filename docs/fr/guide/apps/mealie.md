# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/mealie.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Mealie

Gestionnaire de recettes et planificateur de repas auto-hébergé — organisez vos recettes, planifiez vos repas et générez des listes de courses avec une interface moderne et épurée.

| | |
| --- | --- |
| **Image** | `ghcr.io/mealie-recipes/mealie:latest` |
| **Interface web** | `http://your-server:9925` |
| **Chemin de configuration** | `{BASE_DIR}/mealie/data` |
| **Site web** | [mealie.io](https://docs.mealie.io/) |
| **Code source** | [GitHub](https://github.com/mealie-recipes/mealie) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Serveur de recettes léger |
| **Stockage** | Low — Base de données PostgreSQL pour les recettes |

## Installation

```sh
mithrandir install mealie
```

## Architecture

Mealie fonctionne comme une stack multi-conteneurs :

| Conteneur | Description |
| --- | --- |
| `mealie` | Serveur applicatif principal Mealie (port 9925) |
| `mealie_postgres` | Base de données PostgreSQL 17 |

## Secrets

| Variable | Description |
| --- | --- |
| `MEALIE_DB_PASSWORD` | Mot de passe PostgreSQL (défaut : `mealie`) |

## Configuration

- Ouvrez l'interface web à l'adresse `http://your-server:9925`
- Les identifiants par défaut sont `changeme@email.com` / `MyPassword`
- Changez le mot de passe par défaut immédiatement après la première connexion
- Les inscriptions sont désactivées par défaut — créez des comptes depuis le panneau d'administration

## Importation de recettes

Mealie peut importer des recettes depuis des URLs. Collez un lien depuis n'importe quel site de recettes et Mealie extraira automatiquement les ingrédients, les instructions et les métadonnées.

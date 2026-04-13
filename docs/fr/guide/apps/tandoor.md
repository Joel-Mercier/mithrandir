# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/tandoor-recipes.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Tandoor

Gestionnaire de recettes et planificateur de repas avec listes de courses — organisez vos recettes, planifiez vos repas, créez des listes de courses et gérez votre collection de livres de cuisine.

| | |
| --- | --- |
| **Image** | `vabene1111/recipes:latest` |
| **Interface web** | `http://your-server:9010` |
| **Chemin de configuration** | `{BASE_DIR}/tandoor/{staticfiles,mediafiles,postgres}` |
| **Site web** | [docs.tandoor.dev](https://docs.tandoor.dev/) |
| **Code source** | [GitHub](https://github.com/TandoorRecipes/recipes) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Serveur de recettes léger |
| **Stockage** | Low — Base de données PostgreSQL pour les recettes |

## Installation

```sh
mithrandir install tandoor
```

## Architecture

Tandoor fonctionne comme une stack multi-conteneurs :

| Conteneur | Description |
| --- | --- |
| `tandoor` | Serveur applicatif principal Tandoor (port 9010) |
| `tandoor_postgres` | Base de données PostgreSQL 16 |

## Secrets

| Variable | Description |
| --- | --- |
| `TANDOOR_SECRET_KEY` | Clé secrète Django (générée automatiquement lors de l'installation) |
| `TANDOOR_DB_PASSWORD` | Mot de passe PostgreSQL (défaut : `tandoor`) |

## Configuration

- Lorsque HTTPS est activé, `ALLOWED_HOSTS` est automatiquement défini sur `tandoor.{votre-domaine}.duckdns.org`
- Sans HTTPS, tous les hôtes sont autorisés par défaut

## Configuration initiale

- Ouvrez l'interface web à l'adresse `http://your-server:9010`
- Créez votre compte administrateur au premier lancement
- Commencez à ajouter des recettes manuellement ou importez-les depuis des URLs

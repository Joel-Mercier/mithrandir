# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/adventurelog.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> AdventureLog

Planification de voyages et journal d'aventures — planifiez vos voyages, enregistrez vos aventures et gardez une trace des lieux visités.

| | |
| --- | --- |
| **Image** | `ghcr.io/seanmorley15/adventurelog-frontend:latest` |
| **Interface web** | `http://your-server:8015` |
| **API** | `http://your-server:8016` |
| **Chemin de configuration** | `{BASE_DIR}/adventurelog/postgres` |
| **Site web** | [adventurelog.app](https://adventurelog.app) |
| **Code source** | [GitHub](https://github.com/seanmorley15/AdventureLog) |

## Installation

```sh
mithrandir install adventurelog
```

## Configuration

Lors de l'installation, vous serez invité à fournir :

| Secret | Requis | Description |
| --- | --- | --- |
| `ADVENTURELOG_SECRET_KEY` | Oui | Clé secrète Django (auto-générée) |
| `ADVENTURELOG_DB_PASSWORD` | Non | Mot de passe de la base de données (défaut : `changeme123`) |
| `ADVENTURELOG_ADMIN_USERNAME` | Non | Nom d'utilisateur administrateur (défaut : `admin`) |
| `ADVENTURELOG_ADMIN_PASSWORD` | Non | Mot de passe administrateur (défaut : `admin`) |
| `ADVENTURELOG_ADMIN_EMAIL` | Non | Email administrateur (défaut : `admin@example.com`) |

Après l'installation, ouvrez `http://your-server:8015` et connectez-vous avec les identifiants administrateur que vous avez configurés.

::: warning Premier démarrage lent
Le conteneur backend importe des données géographiques au premier lancement, ce qui peut prendre plusieurs minutes. L'application retournera des erreurs tant que ce processus n'est pas terminé. Vous pouvez suivre la progression avec :

```sh
mithrandir log adventurelog
```
:::

## Architecture

AdventureLog fonctionne avec trois conteneurs :

- **Frontend** — Application SvelteKit sur le port 8015
- **Backend** — API Django sur le port 8016
- **Base de données** — PostGIS (PostgreSQL avec extensions spatiales) pour les données de localisation

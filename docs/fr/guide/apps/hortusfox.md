# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/hortusfox.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> HortusFox

Systeme de gestion de plantes auto-heberge — suivez vos plantes, gerez les calendriers d'arrosage, enregistrez l'historique de croissance et organisez votre jardin. HortusFox fournit une interface web pour cataloguer votre collection de plantes avec des photos, des instructions d'entretien et un suivi de sante.

| | |
| --- | --- |
| **Image** | `ghcr.io/danielbrendel/hortusfox-web:latest` |
| **Interface web** | `http://your-server:8089` |
| **Chemin de configuration** | `{BASE_DIR}/hortusfox/db` |
| **Site web** | [hortusfox.com](https://www.hortusfox.com/) |
| **Code source** | [GitHub](https://github.com/danielbrendel/hortusfox-web) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Faible — Application PHP legere avec MariaDB |
| **Stockage** | Faible — Donnees de plantes et photos |

## Installation

```sh
mithrandir install hortusfox
```

Vous serez invite a fournir :
- **Email administrateur** — utilise pour se connecter a l'interface web
- **Mot de passe administrateur** — mot de passe du compte administrateur initial

## Configuration

Apres l'installation, ouvrez l'interface web a `http://your-server:8089` et connectez-vous avec l'email et le mot de passe administrateur fournis lors de l'installation.

## Architecture

HortusFox fonctionne avec deux conteneurs :
- **hortusfox_app** — Application web PHP servant l'interface sur le port 80 (mappe sur 8089)
- **hortusfox_db** — Base de donnees MariaDB stockant les donnees des plantes

## Variables d'environnement

| Variable | Description | Par defaut |
| --- | --- | --- |
| `HORTUSFOX_ADMIN_EMAIL` | Email de connexion administrateur | `admin@example.com` |
| `HORTUSFOX_ADMIN_PASSWORD` | Mot de passe de connexion administrateur | — |
| `HORTUSFOX_DB_PASSWORD` | Mot de passe MariaDB | `hortusfox` |

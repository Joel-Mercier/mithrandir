# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/n8n.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> n8n

Plateforme d'automatisation de workflows — connectez des applications et automatisez des tâches avec un éditeur visuel.

| | |
| --- | --- |
| **Image** | `docker.n8n.io/n8nio/n8n:latest` |
| **Interface web** | `http://your-server:5678` |
| **Chemin de configuration** | `{BASE_DIR}/n8n/data` |
| **Site web** | [n8n.io](https://n8n.io/) |
| **Code source** | [GitHub](https://github.com/n8n-io/n8n) |

## Installation

```sh
mithrandir install n8n
```

## Configuration

- Ouvrez l'interface web à l'adresse `http://your-server:5678`
- Créez un compte propriétaire au premier lancement
- Commencez à créer des workflows

## Fichiers locaux

n8n dispose d'un répertoire `/files` monté sur `{BASE_DIR}/n8n/files` pour lire et écrire des fichiers locaux depuis les workflows.

# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/paperless-ngx.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Paperless-ngx

Systeme de gestion de documents qui transforme vos documents physiques en une archive en ligne consultable avec OCR.

| | |
| --- | --- |
| **Image** | `ghcr.io/paperless-ngx/paperless-ngx:latest` |
| **Interface web** | `http://votre-serveur:8000` |
| **Chemin de configuration** | `{BASE_DIR}/paperlessngx/data` |
| **Site web** | [docs.paperless-ngx.com](https://docs.paperless-ngx.com/) |
| **Code source** | [GitHub](https://github.com/paperless-ngx/paperless-ngx) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Moyen — Traitement OCR avec broker Redis et base de donnees SQLite |
| **Stockage** | Moyen — Stocke les documents originaux et les donnees OCR |

## Installation

```sh
mithrandir install paperlessngx
```

## Architecture

Paperless-ngx fonctionne en tant que stack multi-conteneurs :

| Conteneur | Description |
| --- | --- |
| `paperlessngx_webserver` | Application principale avec interface web (port 8000) |
| `paperlessngx_broker` | Broker Redis pour la file de taches |

Les donnees sont stockees avec SQLite (pas besoin de conteneur de base de donnees separe). Les documents sont stockes dans quatre repertoires sous `{BASE_DIR}/paperlessngx/` :

- `data/` — Donnees de l'application et base de donnees SQLite
- `media/` — Documents traites et miniatures
- `export/` — Repertoire d'exportation de documents
- `consume/` — Deposez des fichiers ici pour qu'ils soient automatiquement importes

## Configuration

| Variable | Description |
| --- | --- |
| `PAPERLESS_OCR_LANGUAGE` | Langue pour le traitement OCR (par defaut : `eng`). Voir [les langues disponibles](https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions.html) |

Lorsque HTTPS est active via Caddy, `PAPERLESS_URL` est automatiquement defini avec l'URL HTTPS correcte.

## Configuration initiale

- Ouvrez l'interface web a `http://votre-serveur:8000`
- Creez un compte super-utilisateur : vous serez invite lors du premier acces
- Deposez des documents dans le repertoire `consume/` ou telechargez-les via l'interface web

# config

Afficher la configuration actuelle depuis `.env`.

## Utilisation

```sh
mithrandir config
```

## Description

Affiche une vue formatée de tous les paramètres du fichier `.env`, regroupés par catégorie :

- **Paramètres principaux** — `BASE_DIR`, `PUID`, `PGID`, `TZ`
- **Paramètres de sauvegarde** — `BACKUP_DIR`, `LOCAL_RETENTION`, `REMOTE_RETENTION`, `RCLONE_REMOTE`
- **Secrets par application** — jetons et clés (les valeurs sont masquées)

## Variables d'environnement

### Sauvegarde

| Variable | Défaut | Description |
| --- | --- | --- |
| `BACKUP_DIR` | `/backups` | Répertoire de sauvegarde local |
| `LOCAL_RETENTION` | `5` | Nombre de sauvegardes locales à conserver |
| `REMOTE_RETENTION` | `10` | Nombre de sauvegardes distantes à conserver |
| `RCLONE_REMOTE` | `gdrive` | Nom du remote rclone |
| `APPS` | `auto` | Liste d'applications séparées par des virgules, ou `auto` pour toutes les applications installées |
| `BACKUP_PASSWORD` | *(aucun)* | Mot de passe de chiffrement optionnel — chiffre les sauvegardes avec AES-256-CBC |

## Remarques

- Ne nécessite pas les privilèges root
- Les valeurs secrètes (jetons, mots de passe) sont masquées dans la sortie

# config

Afficher la configuration actuelle depuis `.env`.

## Utilisation

```sh
mithrandir config
```

## Description

Affiche une vue formatée de tous les paramètres du fichier `.env`, regroupés par catégorie :

- **Paramètres principaux** — `BASE_DIR`, `PUID`, `PGID`, `TZ`
- **Paramètres de sauvegarde** — `BACKUP_DIR`, `LOCAL_RETENTION`, `REMOTE_RETENTION`, `RCLONE_REMOTES`
- **Secrets par application** — jetons et clés (les valeurs sont masquées)

## Variables d'environnement

### Sauvegarde

| Variable | Défaut | Description |
| --- | --- | --- |
| `BACKUP_DIR` | `/backups` | Répertoire de sauvegarde local |
| `LOCAL_RETENTION` | `5` | Nombre de sauvegardes locales à conserver |
| `REMOTE_RETENTION` | `10` | Nombre de sauvegardes distantes à conserver |
| `RCLONE_REMOTES` | `gdrive` | Noms des remotes rclone, séparés par des virgules |
| `APPS` | `auto` | Liste d'applications séparées par des virgules, ou `auto` pour toutes les applications installées |
| `BACKUP_PASSWORD` | *(aucun)* | Mot de passe de chiffrement optionnel — chiffre les sauvegardes avec AES-256-CBC |

### Accès à distance (Tailscale)

| Variable | Défaut | Description |
| --- | --- | --- |
| `ENABLE_TAILSCALE` | `false` | Passé à `true` par `mithrandir install tailscale` |
| `TAILSCALE_HOSTNAME` | `mithrandir` | Nom de l'appareil dans votre tailnet |
| `TAILSCALE_ADVERTISE_ROUTES` | `auto` | Sous-réseaux partagés avec le tailnet : `auto` (réseau local détecté), `none`, ou CIDR séparés par des virgules |
| `TAILSCALE_EXIT_NODE` | `false` | Proposer ce serveur comme nœud de sortie |
| `TAILSCALE_SSH` | `false` | Activer Tailscale SSH |
| `TAILSCALE_AUTH_KEY` | *(aucun)* | Clé d'authentification optionnelle pour une connexion sans intervention |

Voir [Accès à distance](/fr/guide/remote-access) pour plus de détails.

## Remarques

- Ne nécessite pas les privilèges root
- Les valeurs secrètes (jetons, mots de passe, secrets et variables `*_KEY`) sont masquées dans la sortie

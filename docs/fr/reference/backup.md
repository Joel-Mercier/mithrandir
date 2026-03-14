# backup

Sauvegarder les applications vers le stockage local et distant.

## Utilisation

```sh
mithrandir backup [app]
mithrandir backup list [local|remote]
mithrandir backup delete [--yes] <local|remote> [date]
mithrandir backup verify [options] [date]
mithrandir backup config
mithrandir backup remote <add|list|remove>
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | Optionnel. Application spécifique à sauvegarder. Si omis, sauvegarde toutes les applications de la configuration `APPS` |

## Sous-commandes

### `backup list`

Lister les sauvegardes existantes.

```sh
mithrandir backup list [local|remote]
```

| Argument | Description |
| --- | --- |
| `local` | Lister uniquement les sauvegardes locales |
| `remote` | Lister uniquement les sauvegardes distantes |

Si aucun argument n'est donné, liste les sauvegardes locales et distantes.

### `backup delete`

Supprimer des sauvegardes par emplacement et date optionnelle.

```sh
mithrandir backup delete [--yes] <local|remote> [date]
```

| Argument | Description |
| --- | --- |
| `local` ou `remote` | **Requis.** Quelles sauvegardes supprimer |
| `date` | Optionnel. Date au format `YYYY-MM-DD`. Si omis, propose une sélection |

| Option | Description |
| --- | --- |
| `--yes`, `-y` | Ignorer l'invite de confirmation |

### `backup verify`

Vérifier l'intégrité des archives de sauvegarde.

```sh
mithrandir backup verify [options] [date]
```

| Argument | Description |
| --- | --- |
| `date` | Optionnel. Date au format `YYYY-MM-DD`. Par défaut, la plus récente |

| Option | Description |
| --- | --- |
| `--remote`, `-r` | Vérifier les sauvegardes distantes au lieu des locales |
| `--extract`, `-x` | Tester l'extraction pendant la vérification |

### `backup config`

Afficher et modifier les paramètres de sauvegarde de manière interactive.

```sh
mithrandir backup config
```

Parcourt chaque paramètre de sauvegarde un par un, affichant la valeur actuelle et proposant d'en saisir une nouvelle. Appuyez sur Entrée pour conserver la valeur actuelle.

| Paramètre | Défaut | Description |
| --- | --- | --- |
| `BACKUP_DIR` | `/backups` | Répertoire de sauvegarde local |
| `LOCAL_RETENTION` | `5` | Nombre de sauvegardes locales à conserver |
| `REMOTE_RETENTION` | `10` | Nombre de sauvegardes distantes à conserver |
| `RCLONE_REMOTES` | `gdrive` | Noms des remotes rclone, séparés par des virgules |
| `APPS` | `auto` | Applications à sauvegarder — `auto` pour toutes les installées, ou liste séparée par des virgules |
| `BACKUP_HOUR` | `2` | Heure de la journée (0-23) à laquelle les sauvegardes automatiques s'exécutent |
| `BACKUP_PASSWORD` | *(aucun)* | Mot de passe de chiffrement optionnel (la saisie est masquée) |

Si `BACKUP_HOUR` est modifié et que systemd est disponible, le timer de sauvegarde est automatiquement mis à jour avec le nouvel horaire.

### `backup remote`

Gérer les remotes rclone pour les sauvegardes multi-distant.

#### `backup remote add`

Ajouter un nouveau remote rclone de manière interactive. L'assistant guide la sélection du fournisseur et la saisie des identifiants, puis enregistre le nom du remote dans `RCLONE_REMOTES`.

```sh
mithrandir backup remote add
```

#### `backup remote list`

Lister tous les remotes configurés dans `RCLONE_REMOTES`.

```sh
mithrandir backup remote list
```

#### `backup remote remove`

Supprimer un remote de `RCLONE_REMOTES` et optionnellement de la configuration rclone.

```sh
mithrandir backup remote remove
```

## Description

Crée des archives tar horodatées des répertoires de configuration et de données de chaque application. Les archives sont stockées localement dans `BACKUP_DIR` (par défaut `/backups`) et synchronisées vers tous les remotes rclone configurés dans `RCLONE_REMOTES`.

Les anciennes sauvegardes sont automatiquement purgées selon les paramètres `LOCAL_RETENTION` et `REMOTE_RETENTION`.

## Mode non-TTY

Lorsqu'elle est exécutée depuis un timer systemd ou un shell non interactif, la commande de sauvegarde produit des journaux en texte brut horodatés vers stdout et `/var/log/homelab-backup.log` au lieu de l'interface interactive.

## Chiffrement

Lorsque `BACKUP_PASSWORD` est défini dans `.env`, toutes les sauvegardes sont chiffrées avec AES-256-CBC (via `openssl`) après leur création. Les fichiers chiffrés utilisent l'extension `.tar.zst.enc`. Les commandes de restauration et de vérification détectent automatiquement les fichiers chiffrés et les déchiffrent en utilisant le même mot de passe.

Si une sauvegarde est chiffrée mais qu'aucun mot de passe n'est disponible :
- **Restauration/reprise :** Échoue avec un message d'erreur
- **Vérification :** Signale "chiffré" et réussit (vérification de taille uniquement)

## Configuration associée

| Variable | Défaut | Description |
| --- | --- | --- |
| `BACKUP_DIR` | `/backups` | Répertoire de sauvegarde local |
| `LOCAL_RETENTION` | `5` | Nombre de sauvegardes locales à conserver |
| `REMOTE_RETENTION` | `10` | Nombre de sauvegardes distantes à conserver |
| `RCLONE_REMOTES` | `gdrive` | Noms des remotes rclone, séparés par des virgules |
| `APPS` | `auto` | Liste d'applications séparées par des virgules, ou `auto` pour toutes les applications installées |
| `BACKUP_HOUR` | `2` | Heure de la journée (0-23) à laquelle les sauvegardes automatiques s'exécutent |
| `BACKUP_PASSWORD` | *(aucun)* | Mot de passe de chiffrement optionnel pour les sauvegardes |

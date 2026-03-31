# Sauvegarde et restauration

Mithrandir inclut un système complet de sauvegarde et de reprise après sinistre. Les sauvegardes s'exécutent automatiquement selon un planning quotidien et peuvent être restaurées sur la même machine ou sur une toute nouvelle.

## Comment fonctionnent les sauvegardes

Chaque sauvegarde crée une archive tar horodatée par application contenant ses répertoires de configuration et de données. Les archives sont stockées localement et synchronisées vers un stockage cloud distant via rclone.

La structure du répertoire de sauvegarde ressemble à ceci :

```
/backups/
├── 2025-06-15/
│   ├── jellyfin.tar.zst
│   ├── sonarr.tar.zst
│   ├── radarr.tar.zst
│   ├── secrets.tar.zst
│   └── ...
├── 2025-06-14/
│   └── ...
└── ...
```

L'archive `secrets.tar.zst` contient votre fichier `.env` et la configuration rclone, de sorte qu'une restauration complète puisse récupérer l'ensemble, y compris les identifiants.

## Ce qui est sauvegardé

Les sauvegardes incluent **uniquement la configuration et les métadonnées des applications** — c'est-à-dire les paramètres, les bases de données, les clés API et les index de bibliothèques. Vos fichiers multimédias (films, séries TV, musique, photos) ne sont **pas** inclus dans les sauvegardes car ils sont généralement volumineux et existent déjà sur votre NAS ou vos disques externes.

Si vous devez effectuer une récupération sur une nouvelle machine, redirigez vos applications vers le même stockage multimédia et la configuration restaurée reprendra là où elle s'était arrêtée.

## Sauvegardes automatiques

L'assistant de configuration installe un timer systemd qui exécute les sauvegardes quotidiennement à 2h00 du matin (configurable). Vous pouvez vérifier l'état du timer avec :

```sh
mithrandir status
```

Ou installer/réinstaller le timer de sauvegarde manuellement :

```sh
mithrandir install backup
```

### Modifier l'horaire de sauvegarde

Utilisez la commande de configuration de sauvegarde pour changer l'heure d'exécution des sauvegardes automatiques :

```sh
mithrandir backup config
```

Cette commande interactive parcourt tous les paramètres de sauvegarde et met à jour le timer systemd automatiquement. Vous pouvez aussi définir la variable `BACKUP_HOUR` dans `.env` directement (0-23, par défaut : `2` pour 2h00) et réinstaller le timer avec `mithrandir install backup`.

## Sauvegardes manuelles

Lancez une sauvegarde à la demande :

```sh
# Sauvegarder toutes les applications
mithrandir backup

# Sauvegarder une application spécifique
mithrandir backup jellyfin
```

## Lister les sauvegardes

```sh
# Lister toutes les sauvegardes (locales et distantes)
mithrandir backup list

# Lister uniquement les sauvegardes locales
mithrandir backup list local

# Lister uniquement les sauvegardes distantes
mithrandir backup list remote
```

## Vérifier les sauvegardes

Vérifiez que les archives de sauvegarde sont intactes :

```sh
# Vérifier la dernière sauvegarde locale
mithrandir backup verify

# Vérifier une date spécifique
mithrandir backup verify 2025-06-15

# Vérifier les sauvegardes distantes au lieu des locales
mithrandir backup verify -r

# Tester aussi l'extraction de chaque archive dans un répertoire temporaire (plus lent mais plus complet)
mithrandir backup verify -x
```

## Restaurer à partir d'une sauvegarde

Restaurez une seule application ou tout :

```sh
# Restaurer une application spécifique depuis la dernière sauvegarde
mithrandir restore sonarr

# Restaurer à partir d'une date spécifique
mithrandir restore sonarr 2025-06-15

# Restauration complète de toutes les applications
mithrandir restore full
```

Le processus de restauration vérifie d'abord les sauvegardes locales, puis essaie chaque remote configuré dans l'ordre jusqu'à trouver la sauvegarde.

## Reprise après sinistre

Si vous devez configurer votre homelab de zéro sur une nouvelle machine (ou après une réinstallation de l'OS), utilisez la commande de récupération :

```sh
mithrandir recover
```

Celle-ci vous guide à travers une récupération complète :

1. Installe Docker
2. Installe et configure rclone
3. Se connecte à votre stockage cloud distant de sauvegarde
4. Liste les sauvegardes disponibles pour que vous puissiez choisir
5. Télécharge et restaure toutes les applications
6. Réinstalle le timer de sauvegarde

## Sauvegarde cloud avec rclone

Mithrandir utilise [rclone](https://rclone.org) pour synchroniser les sauvegardes vers un ou plusieurs stockages cloud distants. Les fournisseurs pris en charge incluent Google Drive, SFTP, S3, Dropbox, OneDrive et iCloud Drive.

### Configuration automatique de rclone

Si vous définissez les variables suivantes dans votre `.env`, rclone est configuré automatiquement — pas besoin d'exécuter `rclone config` manuellement :

| Variable | Description |
| --- | --- |
| `RCLONE_GDRIVE_APP_ID` | ID client OAuth Google Drive |
| `RCLONE_GDRIVE_APP_SECRET` | Secret client OAuth Google Drive |
| `RCLONE_GDRIVE_TOKEN` | Chaîne JSON du jeton OAuth (obtenue via `rclone authorize`) |

Pour obtenir ces valeurs :

1. Créez un projet Google Cloud et un ID client OAuth en suivant le [guide rclone Google Drive](https://rclone.org/drive/#making-your-own-client-id)
2. Exécutez `rclone authorize "drive"` sur une machine disposant d'un navigateur pour obtenir le JSON du jeton
3. Ajoutez les trois valeurs à votre `.env`

La configuration rclone est générée automatiquement lors de la première sauvegarde. Si une configuration existe déjà avec le même nom de remote, elle ne sera pas écrasée (préservant les jetons renouvelés).

### Configuration manuelle de rclone

Alternativement, exécutez `rclone config` de manière interactive pour configurer n'importe quel fournisseur cloud pris en charge (pas seulement Google Drive).

> [!WARNING] OAuth en mode headless
> Les fournisseurs OAuth (Google Drive, Dropbox, OneDrive) nécessitent un navigateur pour l'autorisation. Si votre serveur est headless, exécutez `rclone authorize "<fournisseur>"` sur une machine disposant d'un navigateur, puis copiez le jeton résultant dans la configuration rclone ou le `.env` de votre serveur.

## Configuration multi-distant

Mithrandir prend en charge la synchronisation des sauvegardes vers **plusieurs remotes** simultanément pour une redondance accrue. Par exemple, vous pouvez sauvegarder à la fois vers Google Drive et un serveur SFTP.

### Gérer les remotes

Utilisez les sous-commandes `backup remote` pour gérer vos remotes :

```sh
# Ajouter un nouveau remote
mithrandir backup remote add

# Lister les remotes configurés
mithrandir backup remote list

# Supprimer un remote
mithrandir backup remote remove
```

### Variable d'environnement

Définissez `RCLONE_REMOTES` dans votre `.env` avec une liste séparée par des virgules :

```
RCLONE_REMOTES=gdrive,sftp-nas,s3-backup
```

L'ancienne variable `RCLONE_REMOTE` (au singulier) reste fonctionnelle pour la rétrocompatibilité.

### Comportement

- **Sauvegarde :** Les archives sont synchronisées vers **tous** les remotes configurés de manière redondante.
- **Restauration :** Les remotes sont essayés dans l'ordre jusqu'à ce que la sauvegarde soit trouvée.
- **Vérification** et **liste** avec `--remote` fonctionnent sur tous les remotes.
- **Rétention :** Les règles de purge s'appliquent indépendamment à chaque remote.

> [!WARNING] iCloud Drive (Expérimental)
> iCloud Drive est pris en charge mais considéré comme expérimental. Le jeton de confiance expire après environ 30 jours et doit être renouvelé. La Protection Avancée des Données (ADP) n'est pas prise en charge.

## Chiffrement

Les sauvegardes peuvent être chiffrées avant le stockage afin que les données sensibles (identifiants, clés privées, coffres Vaultwarden) soient protégées sur les stockages cloud distants.

Pour activer le chiffrement, définissez `BACKUP_PASSWORD` dans votre `.env` :

```
BACKUP_PASSWORD=your-secure-password
```

Lorsqu'il est défini, toutes les nouvelles sauvegardes sont chiffrées avec AES-256-CBC (dérivation de clé PBKDF2, 100 000 itérations) via `openssl`. Les fichiers chiffrés ont l'extension `.tar.zst.enc`.

::: danger
Conservez votre mot de passe de sauvegarde en lieu sûr en dehors de votre homelab (ex. un gestionnaire de mots de passe). Sans lui, les sauvegardes chiffrées ne peuvent pas être restaurées. C'est particulièrement important pour la reprise après sinistre — `mithrandir recover` a besoin du mot de passe pour déchiffrer `secrets.tar.zst`, qui contient le fichier `.env` lui-même. Vous devez connaître votre `BACKUP_PASSWORD` avant de lancer la récupération sur une machine neuve.
:::

### Fonctionnement du chiffrement

- **Sauvegarde :** Les archives sont créées en `.tar.zst`, puis chiffrées en `.tar.zst.enc`. Le fichier non chiffré est supprimé.
- **Restauration :** Les sauvegardes chiffrées sont détectées automatiquement par leur extension. Le mot de passe est lu depuis `BACKUP_PASSWORD` dans `.env`.
- **Vérification :** Avec un mot de passe défini, `backup verify` déchiffre les archives dans un fichier temporaire pour vérifier l'intégrité. Sans mot de passe, les sauvegardes chiffrées affichent uniquement la taille et passent la vérification.
- **Vérification de santé :** `mithrandir health` indique l'état du chiffrement — si les sauvegardes sont chiffrées, non chiffrées ou mixtes.
- **Rétrocompatible :** Les sauvegardes non chiffrées `.tar.zst` continuent de fonctionner. Les deux formats peuvent coexister dans le même répertoire de sauvegarde.

## Rétention

Les anciennes sauvegardes sont automatiquement purgées après chaque exécution de sauvegarde. Configurez la rétention dans votre `.env` :

| Variable | Par défaut | Description |
| --- | --- | --- |
| `BACKUP_DIR` | `/backups` | Répertoire de sauvegarde local |
| `LOCAL_RETENTION` | `5` | Nombre de sauvegardes locales à conserver |
| `REMOTE_RETENTION` | `10` | Nombre de sauvegardes distantes à conserver |
| `RCLONE_REMOTES` | `gdrive` | Noms des remotes rclone, séparés par des virgules |
| `APPS` | `auto` | Applications à sauvegarder — `auto` pour toutes les installées, ou liste séparée par des virgules |
| `BACKUP_HOUR` | `2` | Heure de la journée (0-23) à laquelle les sauvegardes automatiques s'exécutent |

## Supprimer des sauvegardes manuellement

```sh
# Supprimer une sauvegarde locale spécifique
mithrandir backup delete local 2025-06-10

# Supprimer une sauvegarde distante (avec invite de confirmation)
mithrandir backup delete remote 2025-06-10

# Ignorer la confirmation
mithrandir backup delete --yes local 2025-06-10
```

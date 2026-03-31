# Backup & Restore

Mithrandir includes a full backup and disaster recovery system. Backups run automatically on a daily schedule and can be restored on the same machine or a completely new one.

## How Backups Work

Each backup creates a timestamped tar archive per app containing its configuration and data directories. Archives are stored locally and synced to a cloud remote via rclone.

The backup directory structure looks like:

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

The `secrets.tar.zst` archive contains your `.env` file and rclone configuration, so a full restore can recover everything including credentials.

## What Gets Backed Up

Backups include **app configuration and metadata only** — things like settings, databases, API keys, and library indexes. Your actual media files (movies, TV shows, music, photos) are **not** included in backups since they are typically large and already exist on your NAS or external drives.

If you need to recover on a new machine, re-point your apps at the same media storage and the restored configuration will pick everything up where it left off.

## Automatic Backups

The setup wizard installs a systemd timer that runs backups daily at 2:00 AM (configurable). You can check the timer status with:

```sh
mithrandir status
```

Or install/reinstall the backup timer manually:

```sh
mithrandir install backup
```

### Changing the Backup Schedule

Use the backup config command to change the hour when automatic backups run:

```sh
mithrandir backup config
```

This interactive command walks through all backup settings and updates the systemd timer automatically. You can also set the `BACKUP_HOUR` variable in `.env` directly (0-23, default: `2` for 2:00 AM) and reinstall the timer with `mithrandir install backup`.

## Manual Backups

Run a backup on demand:

```sh
# Backup all apps
mithrandir backup

# Backup a specific app
mithrandir backup jellyfin
```

## Listing Backups

```sh
# List all backups (local and remote)
mithrandir backup list

# List only local backups
mithrandir backup list local

# List only remote backups
mithrandir backup list remote
```

## Verifying Backups

Check that backup archives are intact:

```sh
# Verify latest local backup
mithrandir backup verify

# Verify a specific date
mithrandir backup verify 2025-06-15

# Verify remote backups instead of local ones
mithrandir backup verify -r

# Also test extracting each archive to a temp directory (slower but more thorough)
mithrandir backup verify -x
```

## Restoring from Backup

Restore a single app or everything:

```sh
# Restore a specific app from the latest backup
mithrandir restore sonarr

# Restore from a specific date
mithrandir restore sonarr 2025-06-15

# Full restore of all apps
mithrandir restore full
```

The restore process checks local backups first, then tries each configured remote in order until it finds the backup.

## Disaster Recovery

If you need to set up your homelab from scratch on a new machine (or after a fresh OS install), use the recovery command:

```sh
mithrandir recover
```

This walks you through a complete recovery:

1. Installs Docker
2. Installs and configures rclone
3. Connects to your cloud backup remote
4. Lists available backups for you to choose from
5. Downloads and restores all apps
6. Reinstalls the backup timer

## Cloud Backup with rclone

Mithrandir uses [rclone](https://rclone.org) to sync backups to one or more cloud remotes. Supported providers include Google Drive, SFTP, S3, Dropbox, OneDrive, and iCloud Drive.

### Automatic rclone Setup (Google Drive)

If you set the following variables in your `.env`, rclone is configured automatically — no need to run `rclone config` manually:

| Variable | Description |
| --- | --- |
| `RCLONE_GDRIVE_APP_ID` | Google Drive OAuth client ID |
| `RCLONE_GDRIVE_APP_SECRET` | Google Drive OAuth client secret |
| `RCLONE_GDRIVE_TOKEN` | OAuth token JSON string (from `rclone authorize`) |

To get these values:

1. Create a Google Cloud project and OAuth client ID by following the [rclone Google Drive guide](https://rclone.org/drive/#making-your-own-client-id)
2. Run `rclone authorize "drive"` on a machine with a browser to get the token JSON
3. Add all three values to your `.env`

The rclone config is auto-generated the first time a backup runs. If a config already exists with the same remote name, it won't be overwritten (preserving refreshed tokens).

> [!WARNING] Headless OAuth
> OAuth providers (Google Drive, Dropbox, OneDrive) require a browser for authorization. If your server is headless, run `rclone authorize "<provider>"` on a machine with a browser first, then copy the resulting token to your server's rclone config or `.env`.

### Manual rclone Setup

Alternatively, run `rclone config` interactively to set up any supported cloud provider (not just Google Drive).

### Multi-Remote Setup

You can sync backups to multiple remotes for redundancy. Configure this with `RCLONE_REMOTES` (comma-separated) in your `.env`:

```
RCLONE_REMOTES=gdrive,dropbox,sftp-nas
```

Or use the interactive remote management commands:

```sh
# Add a new remote
mithrandir backup remote add

# List configured remotes
mithrandir backup remote list

# Remove a remote
mithrandir backup remote remove
```

When multiple remotes are configured:

- **Backup** syncs to all configured remotes redundantly
- **Restore** tries each remote in order until it finds the backup
- **Verify** and **list** with `--remote` work across all remotes
- **Retention** pruning applies to each remote independently

The legacy `RCLONE_REMOTE` (singular) variable still works for backwards compatibility and is treated as a single-remote configuration.

> [!WARNING] iCloud Drive (Experimental)
> iCloud Drive is supported but considered experimental. The trust token expires after approximately 30 days and must be refreshed. Advanced Data Protection (ADP) is not supported.

## Encryption

Backups can be encrypted before storage so that sensitive data (credentials, private keys, Vaultwarden vaults) is protected on cloud remotes.

To enable encryption, set `BACKUP_PASSWORD` in your `.env`:

```
BACKUP_PASSWORD=your-secure-password
```

When set, all new backups are encrypted with AES-256-CBC (PBKDF2 key derivation, 100k iterations) using `openssl`. Encrypted files have the `.tar.zst.enc` extension.

::: danger
Store your backup password somewhere safe outside of your homelab (e.g. a password manager). Without it, encrypted backups cannot be restored. This is especially important for disaster recovery — `mithrandir recover` needs the password to decrypt `secrets.tar.zst`, which contains the `.env` file itself. You must know your `BACKUP_PASSWORD` before starting recovery on a fresh machine.
:::

### How Encryption Works

- **Backup:** Archives are created as `.tar.zst`, then encrypted to `.tar.zst.enc`. The unencrypted file is removed.
- **Restore:** Encrypted backups are detected automatically by extension. The password is read from `BACKUP_PASSWORD` in `.env`.
- **Verify:** With a password set, `backup verify` decrypts archives to a temp file for integrity checking. Without a password, encrypted backups report size only and pass verification.
- **Health check:** `mithrandir health` reports encryption status — whether backups are encrypted, unencrypted, or mixed.
- **Backward compatible:** Unencrypted `.tar.zst` backups continue to work. Both formats can coexist in the same backup directory.

## Retention

Old backups are pruned automatically after each backup run. Configure retention in your `.env`:

| Variable | Default | Description |
| --- | --- | --- |
| `BACKUP_DIR` | `/backups` | Local backup directory |
| `LOCAL_RETENTION` | `5` | Number of local backups to keep |
| `REMOTE_RETENTION` | `10` | Number of remote backups to keep |
| `RCLONE_REMOTES` | `gdrive` | Comma-separated list of rclone remote names |
| `APPS` | `auto` | Apps to backup — `auto` for all installed, or comma-separated list |
| `BACKUP_HOUR` | `2` | Hour of the day (0-23) when automatic backups run |

## Deleting Backups Manually

```sh
# Delete a specific local backup
mithrandir backup delete local 2025-06-10

# Delete a remote backup (with confirmation prompt)
mithrandir backup delete remote 2025-06-10

# Skip confirmation
mithrandir backup delete --yes local 2025-06-10
```

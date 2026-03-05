# Backup & Restore

Mithrandir includes a full backup and disaster recovery system. Backups run automatically on a daily schedule and can be restored on the same machine or a completely new one.

## How Backups Work

Each backup creates a timestamped tar archive per app containing its configuration and data directories. Archives are stored locally and synced to a cloud remote via rclone.

The backup directory structure looks like:

```
/backups/
├── 2024-01-15/
│   ├── jellyfin.tar.gz
│   ├── sonarr.tar.gz
│   ├── radarr.tar.gz
│   ├── secrets.tar.gz
│   └── ...
├── 2024-01-14/
│   └── ...
└── ...
```

The `secrets.tar.gz` archive contains your `.env` file and rclone configuration, so a full restore can recover everything including credentials.

## What Gets Backed Up

Backups include **app configuration and metadata only** — things like settings, databases, API keys, and library indexes. Your actual media files (movies, TV shows, music, photos) are **not** included in backups since they are typically large and already exist on your NAS or external drives.

If you need to recover on a new machine, re-point your apps at the same media storage and the restored configuration will pick everything up where it left off.

## Automatic Backups

The setup wizard installs a systemd timer that runs backups daily at 2:00 AM. You can check the timer status with:

```sh
sudo mithrandir status
```

Or install/reinstall the backup timer manually:

```sh
sudo mithrandir install backup
```

## Manual Backups

Run a backup on demand:

```sh
# Backup all apps
sudo mithrandir backup

# Backup a specific app
sudo mithrandir backup jellyfin
```

## Listing Backups

```sh
# List all backups (local and remote)
sudo mithrandir backup list

# List only local backups
sudo mithrandir backup list local

# List only remote backups
sudo mithrandir backup list remote
```

## Verifying Backups

Check that backup archives are intact:

```sh
# Verify latest local backup
sudo mithrandir backup verify

# Verify a specific date
sudo mithrandir backup verify 2024-01-15

# Verify remote backups
sudo mithrandir backup verify --remote

# Also test extraction
sudo mithrandir backup verify --extract
```

## Restoring from Backup

Restore a single app or everything:

```sh
# Restore a specific app from the latest backup
sudo mithrandir restore sonarr

# Restore from a specific date
sudo mithrandir restore sonarr 2024-01-15

# Full restore of all apps
sudo mithrandir restore full
```

The restore process checks local backups first, then falls back to the remote.

## Disaster Recovery

If you need to set up your homelab from scratch on a new machine (or after a fresh OS install), use the recovery command:

```sh
sudo mithrandir recover
```

This walks you through a complete recovery:

1. Installs Docker
2. Installs and configures rclone
3. Connects to your cloud backup remote
4. Lists available backups for you to choose from
5. Downloads and restores all apps
6. Reinstalls the backup timer

## Cloud Backup with Google Drive

Mithrandir uses [rclone](https://rclone.org) to sync backups to a cloud remote. The default remote is Google Drive.

### Automatic rclone Setup

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

### Manual rclone Setup

Alternatively, run `rclone config` interactively to set up any supported cloud provider (not just Google Drive).

## Retention

Old backups are pruned automatically after each backup run. Configure retention in your `.env`:

| Variable | Default | Description |
| --- | --- | --- |
| `BACKUP_DIR` | `/backups` | Local backup directory |
| `LOCAL_RETENTION` | `5` | Number of local backups to keep |
| `REMOTE_RETENTION` | `10` | Number of remote backups to keep |
| `RCLONE_REMOTE` | `gdrive` | rclone remote name |
| `APPS` | `auto` | Apps to backup — `auto` for all installed, or comma-separated list |

## Deleting Backups Manually

```sh
# Delete a specific local backup
sudo mithrandir backup delete local 2024-01-10

# Delete a remote backup (with confirmation prompt)
sudo mithrandir backup delete remote 2024-01-10

# Skip confirmation
sudo mithrandir backup delete local 2024-01-10 --yes
```

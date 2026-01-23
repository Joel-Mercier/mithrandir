---
name: Backup and Restore Strategy
overview: Implement a backup strategy with automatic daily backups, local and Google Drive retention, and restore capability for individual apps or full setup. Uses rclone for Google Drive uploads.
todos:
  - id: create-config
    content: Create backup.conf configuration file with all settings
    status: completed
  - id: create-backup-script
    content: Implement backup.sh with app detection, tarball creation, rotation, and rclone upload
    status: completed
  - id: create-restore-script
    content: Implement restore.sh with container stop/start logic and backup extraction
    status: completed
  - id: create-systemd-files
    content: Create systemd service and timer files for automated daily backups
    status: completed
  - id: add-helper-functions
    content: Add utility functions for app mapping, backup validation, and rotation logicMake sure rclone is installed as part of the process of setup.sh we don't want to have to do it manually
    status: completed
isProject: false
---

# Backup and Restore Strategy Implementation

## Overview

Create a robust backup and restore system for Docker-based home lab applications that:

- Performs file-level backups of config directories, compose files, and secrets
- Maintains configurable local and remote retention policies
- Provides safe restore procedures that stop containers before restoring
- Supports both manual and automated daily execution

## Architecture

### Backup Structure

```
/backups/
├── latest/                    # Symlinks or copies of most recent backups
│   ├── homeassistant.tar.zst
│   ├── qbittorrent.tar.zst
│   ├── radarr.tar.zst
│   ├── sonarr.tar.zst
│   └── ... (one per app)
├── archive/
│   ├── 2025-01-01/
│   │   ├── homeassistant.tar.zst
│   │   ├── qbittorrent.tar.zst
│   │   └── ...
│   └── 2025-01-02/
│       └── ...
└── secrets.tar.zst            # .env and setup.sh (backed up separately)
```

### Key Components

1. **`backup.conf`** - Configuration file with:

   - `BASE_DIR` - Base directory for Docker apps
   - `BACKUP_DIR` - Where backups are stored (default: `/backups`)
   - `LOCAL_RETENTION` - Number of local backups to keep (default: 5)
   - `REMOTE_RETENTION` - Number of remote backups to keep (default: 10)
   - `RCLONE_REMOTE` - rclone remote name for Google Drive
   - `APPS` - Space-separated list of app names to backup (or "auto" to detect)

2. **`backup.sh`** - Main backup script that:

   - Reads configuration from `backup.conf`
   - Detects installed apps (if auto mode) or uses configured list
   - For each app:
     - Creates compressed tarball of config directory
     - Includes docker-compose.yml in the tarball
   - Backs up `.env` file and `setup.sh` as `secrets.tar.zst`
   - Creates dated archive directory
   - Rotates old local backups (keeps N most recent)
   - Uploads to Google Drive via rclone
   - Rotates old remote backups (keeps N most recent)

3. **`restore.sh`** - Restore script that:

   - Accepts arguments: `[app_name] [date]` or `full [date]`
   - Validates backup exists (local or remote)
   - For app restore:
     - Stops container (if running)
     - Removes config directory
     - Extracts backup
     - Starts container via docker compose
   - For full restore:
     - Restores all apps in dependency order (if applicable)
     - Restores secrets (.env and setup.sh)

4. **Systemd timer** (or cron entry) - For automatic daily backups

## App Detection Logic

Each app from `setup.sh` has a specific config location:

- `homeassistant`: `$BASE_DIR/homeassistant/data` → backup as `homeassistant`
- `qbittorrent`: `$BASE_DIR/qbittorrent/config` → backup as `qbittorrent`
- `prowlarr`: `$BASE_DIR/prowlarr/config` → backup as `prowlarr`
- `radarr`: `$BASE_DIR/radarr/config` → backup as `radarr`
- `sonarr`: `$BASE_DIR/sonarr/config` → backup as `sonarr`
- `bazarr`: `$BASE_DIR/bazarr/config` → backup as `bazarr`
- `lidarr`: `$BASE_DIR/lidarr/config` → backup as `lidarr`
- `jellyseerr`: `$BASE_DIR/jellyseerr/app/config` → backup as `jellyseerr`
- `homarr`: `$BASE_DIR/homarr/configs`, `icons`, `data` (multiple dirs) → backup as `homarr`
- `jellyfin`: `$BASE_DIR/jellyfin/config` → backup as `jellyfin`
- `navidrome`: `$BASE_DIR/navidrome/data` → backup as `navidrome`
- `duckdns`: `$BASE_DIR/duckdns/config` → backup as `duckdns`
- `wireguard`: `$BASE_DIR/wireguard/config` → backup as `wireguard`
- `uptime-kuma`: `$BASE_DIR/uptime-kuma/data` → backup as `uptime-kuma`

For auto-detection, script scans for `docker-compose.yml` files and checks if corresponding config directory exists.

## Implementation Details

### Backup Process

1. Source `.env` file to get BASE_DIR (if not in backup.conf)
2. For each app:

   - Verify config directory exists
   - Create tarball: `tar --zstd -cf app_name.tar.zst -C BASE_DIR app_dir/config docker-compose.yml`
   - Store in `BACKUP_DIR/archive/YYYY-MM-DD/`
   - Update symlink in `BACKUP_DIR/latest/`

3. Backup secrets: `.env` file and `setup.sh` script
4. Rotate local backups (oldest first, keep N)
5. Upload new archive to Google Drive via rclone
6. Rotate remote backups (rclone list, keep N most recent)

### Restore Process

1. Parse arguments (app_name or "full", optional date)
2. If date specified, use that archive; else use latest
3. Check if backup exists locally; if not, check remote
4. If remote only, download via rclone
5. For app restore:

   - `docker compose -f APP_DIR/docker-compose.yml down`
   - `rm -rf APP_DIR/config` (or appropriate dir)
   - `tar --zstd -xf backup.tar.zst -C BASE_DIR`
   - `docker compose -f APP_DIR/docker-compose.yml up -d`

6. For full restore:

   - Restore secrets first
   - Restore all apps (order-independent since each is self-contained)

### Google Drive Integration

- Uses rclone for uploads/downloads
- Assumes rclone is configured with a remote named in `RCLONE_REMOTE`
- Stores backups in: `rclone_remote:/backups/archive/YYYY-MM-DD/`
- Uses `rclone copy` for uploads (not sync, to avoid deleting)
- Uses `rclone ls` to list and identify backups for rotation

## Files to Create

1. `backup.conf` - Configuration file template
2. `backup.sh` - Main backup script (executable)
3. `restore.sh` - Restore script (executable)
4. `systemd/homelab-backup.service` - Systemd service file
5. `systemd/homelab-backup.timer` - Systemd timer for daily execution

## Safety Features

- Never restore over running containers (always stop first)
- Validation checks for backup existence before restore
- Dry-run option for backup script
- Logging to `/var/log/homelab-backup.log` or similar
- Error handling with proper exit codes
- Pre-restore confirmation prompts (can be bypassed with flag)

## Dependencies

- `tar` with zstd support (usually `tar` + `zstd` package)
- `rclone` (user must configure separately)
- `docker` and `docker compose`
- Standard bash utilities

## Configuration Example

```bash
# backup.conf
BASE_DIR=/home/pi
BACKUP_DIR=/backups
LOCAL_RETENTION=5
REMOTE_RETENTION=10
RCLONE_REMOTE=gdrive
APPS="auto"  # or space-separated list: "radarr sonarr jellyfin"
```

## Usage Examples

# Manual backup
./backup.sh

# Restore specific app from specific date
./restore.sh jellyfin 2025-01-01

# Restore specific app from latest
./restore.sh jellyfin

# Restore all apps from latest
./restore.sh full

# Restore all apps from specific date
./restore.sh full 2025-01-01
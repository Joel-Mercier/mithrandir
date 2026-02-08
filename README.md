# Home Lab Setup

Automated setup and backup system for Docker-based homelab applications.

## Configuration

### .env File
Contains environment variables for the setup script:
- `BASE_DIR`: Base directory where Docker app folders are located (e.g., `/opt/docker`)

### backup.conf
Backup configuration file:
- `BASE_DIR`: Docker app folders location (falls back to .env if not set)
- `BACKUP_DIR`: Local backup storage directory (default: `/backups`)
- `LOCAL_RETENTION`: Number of local backups to keep (default: `5`)
- `REMOTE_RETENTION`: Number of Google Drive backups to keep (default: `10`)
- `RCLONE_REMOTE`: rclone remote name for Google Drive (default: `gdrive`)
- `APPS`: Apps to backup - `"auto"` to detect installed apps, or space-separated list

### Systemd Service

Automatically generated and installed by `setup.sh` to `/etc/systemd/system/`:
- **Service**: `homelab-backup.service`
  - Runs `backup.sh` as a oneshot service
  - Path to `backup.sh` is automatically configured
- **Timer**: `homelab-backup.timer`
  - Runs daily at 2:00 AM with 0-30 minute randomization
  - Persistent: runs immediately if system was off during scheduled time

## Usage

First, configure everything in the Configuration section above, then:

**Initial setup and updates:**
```bash
bash setup.sh [--yes] [--uninstall]
```
- `--yes`: Skip confirmation prompts
- `--uninstall`: Interactively remove individual apps (stops container, removes config and compose file)

Run for first install or to update containers.

**Backup:**
```bash
bash backup.sh
```
Backs up all configured apps automatically. No arguments required. Runs without root — uses `sudo` internally for privileged operations.

**Restore:**
```bash
bash restore.sh <app_name|full> [date] [--yes]
```
- `app_name`: Name of app to restore (e.g., `jellyfin`, `radarr`, `sonarr`)
- `full`: Restore all apps and secrets
- `date`: Backup date in `YYYY-MM-DD` format (default: `latest`)
- `--yes`: Skip confirmation prompts

Examples:
- `bash restore.sh jellyfin` - Restore jellyfin from latest backup
- `bash restore.sh jellyfin 2025-01-01` - Restore jellyfin from specific date
- `bash restore.sh full` - Restore all apps from latest backup
- `bash restore.sh full 2025-01-01 --yes` - Restore all apps from specific date without confirmation

## TODO

- [ ] Replace Uptime Kuma with Gatus which has support for file based configuration (could allow to setup alerts and monitoring directly in the script without using the UI)
- [ ] Check if Profilarr is a good solution for quality profiles
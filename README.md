# Home Lab Setup

Automated setup and backup system for Docker-based homelab applications.

## Quick Start

```bash
git clone <repo> && cd homelab
bash cli/install.sh          # Installs Bun + dependencies
sudo bun run cli/src/index.tsx setup
```

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
- `APPS`: Apps to backup - `"auto"` to detect installed apps, or comma-separated list

### Systemd Service

Automatically generated and installed by setup to `/etc/systemd/system/`:
- **Service**: `homelab-backup.service`
  - Runs backup as a oneshot service
  - Path is automatically configured during setup
- **Timer**: `homelab-backup.timer`
  - Runs daily at 2:00 AM with 0-30 minute randomization
  - Persistent: runs immediately if system was off during scheduled time

## Usage (CLI)

The Ink CLI requires Bun. Run `bash cli/install.sh` first to install Bun and dependencies on a bare Debian/Ubuntu server.

**Setup wizard:**
```bash
sudo bun run cli/src/index.tsx setup [--yes]
```
Interactive multi-step wizard: installs Docker and rclone, prompts for base directory, lets you pick services to install, configures the systemd backup timer, and prints a summary with service URLs. `--yes` skips all prompts, selects all apps, and uses defaults from `.env`.

**Backup:**
```bash
sudo bun run cli/src/index.tsx backup
```
Backs up all configured apps. In a terminal it shows spinners and colored progress; from systemd (non-TTY) it writes timestamped plaintext to stdout and `/var/log/homelab-backup.log`.

**Restore:**
```bash
sudo bun run cli/src/index.tsx restore <app|full> [date] [--yes]
```
- `app`: Name of app to restore (e.g., `jellyfin`, `radarr`, `sonarr`)
- `full`: Restore all apps and secrets
- `date`: Backup date in `YYYY-MM-DD` format (default: `latest`)
- `--yes`: Skip confirmation prompts

Examples:
```bash
sudo bun run cli/src/index.tsx restore jellyfin
sudo bun run cli/src/index.tsx restore jellyfin 2025-01-01
sudo bun run cli/src/index.tsx restore full
sudo bun run cli/src/index.tsx restore full 2025-01-01 --yes
```

**Uninstall an app:**
```bash
sudo bun run cli/src/index.tsx uninstall <app>
```
Stops and removes the container. Prompts whether to also delete the app's data and configuration.

**Full system uninstall:**
```bash
sudo bun run cli/src/index.tsx uninstall
```
Removes all Homelab components: Docker, backup systemd timer, rclone, local backups, and app data directories. Equivalent to `sudo bash uninstall.sh`.

## Usage (Bash — legacy)

The original bash scripts remain as a fallback until the CLI is proven stable.

**Initial setup and updates:**
```bash
bash setup.sh [--yes] [--uninstall <app>]
```
- `--yes`: Skip confirmation prompts
- `--uninstall <app>`: Remove an individual app (stops container, removes config and compose file)

**Backup:**
```bash
bash backup.sh
```
Backs up all configured apps automatically. No arguments required. Runs without root — uses `sudo` internally for privileged operations.

**Restore:**
```bash
bash restore.sh <app_name|full> [date] [--yes]
```

**Uninstall:**
```bash
sudo bash uninstall.sh
```
Uninstalls all Homelab components, including Docker, backup systemd timer, rclone, and local backups. Also prompts for confirmation to delete all app data directories.

## TODO

- [ ] Restructure the project to use Bun as a build tool and to have a nicer API to run commands (e.g., `homelab setup` instead of `bun run cli/src/index.tsx setup`)
- [ ] Replace Uptime Kuma with Gatus which has support for file based configuration (could allow to setup alerts and monitoring directly in the script without using the UI)
- [ ] Check if Profilarr is a good solution for quality profiles

# Mithrandir - Home Lab Setup

Automated setup and backup system for Docker-based homelab applications.

## Quick Start

```bash
git clone <repo> && cd mithrandir
bash cli/install.sh          # Installs Bun + dependencies
sudo mithrandir setup
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

The CLI requires Bun. Run `bash cli/install.sh` first to install Bun, build the CLI, and install the `mithrandir` command on a bare Debian/Ubuntu server.

**Setup wizard:**
```bash
sudo mithrandir setup [--yes]
```
Interactive multi-step wizard: installs Docker and rclone, prompts for base directory, lets you pick services to install, configures the systemd backup timer, and prints a summary with service URLs. `--yes` skips all prompts, selects all apps, and uses defaults from `.env`.

**Backup:**
```bash
sudo mithrandir backup
```
Backs up all configured apps. In a terminal it shows spinners and colored progress; from systemd (non-TTY) it writes timestamped plaintext to stdout and `/var/log/homelab-backup.log`.

**Delete backups:**
```bash
sudo mithrandir backup delete <local|remote> [YYYY-MM-DD] [--yes]
```
- `local`: Delete local backups from the archive directory
- `remote`: Delete remote backups via rclone
- `YYYY-MM-DD`: Optional date — deletes only that date's backup. Without a date, deletes all backups
- `--yes`: Skip confirmation prompt

Examples:
```bash
sudo mithrandir backup delete local                  # Delete all local backups
sudo mithrandir backup delete local 2025-06-01       # Delete a specific local backup
sudo mithrandir backup delete remote --yes           # Delete all remote backups (no prompt)
sudo mithrandir backup delete remote 2025-06-01      # Delete a specific remote backup
```

**Restore:**
```bash
sudo mithrandir restore <app|full> [date] [--yes]
```
- `app`: Name of app to restore (e.g., `jellyfin`, `radarr`, `sonarr`)
- `full`: Restore all apps and secrets
- `date`: Backup date in `YYYY-MM-DD` format (default: `latest`)
- `--yes`: Skip confirmation prompts

Examples:
```bash
sudo mithrandir restore jellyfin
sudo mithrandir restore jellyfin 2025-01-01
sudo mithrandir restore full
sudo mithrandir restore full 2025-01-01 --yes
```

**Uninstall an app:**
```bash
sudo mithrandir uninstall <app>
```
Stops and removes the container. Prompts whether to also delete the app's data and configuration.

**Full system uninstall:**
```bash
sudo mithrandir uninstall
```
Removes all Homelab components: Docker, backup systemd timer, rclone, local backups, and app data directories. Equivalent to `sudo bash uninstall.sh`.

**Stauts check:**
```bash
sudo mithrandir status
```
Displays the status of all Homelab components: Docker, backup systemd timer, rclone, local backups, and app data directories.

**Update containers:**
```bash
sudo mithrandir update [app] [--yes]
```
Pulls the latest Docker images for installed apps and recreates containers that have newer images available. Optionally backs up apps before updating. Without an app name, updates all installed apps. `--yes` skips the backup confirmation prompt.

Examples:
```bash
sudo mithrandir update                       # Update all installed apps
sudo mithrandir update radarr                # Update only Radarr
sudo mithrandir update --yes                 # Update all, skip backup prompt
```

**Health check:**
```bash
sudo mithrandir health
```
Validates system health across five dimensions: Docker daemon, disk space (warn at 80%, fail at 95%), backup age (warn >2 days, fail >7 days), container restart loops (fail if RestartCount >5 or status "restarting"), and remote backup connectivity via rclone. Exit code 0 if all pass/warn, 1 if any fail — useful for monitoring and automation.

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

**Delete backups:**
```bash
bash backup.sh delete <local|remote> [YYYY-MM-DD]
```
Deletes local or remote backups. Without a date, deletes all backups for the given target.

**Restore:**
```bash
bash restore.sh <app_name|full> [date] [--yes]
```

**Uninstall:**
```bash
sudo bash uninstall.sh
```
Uninstalls all Homelab components, including Docker, backup systemd timer, rclone, and local backups. Also prompts for confirmation to delete all app data directories.

## Available Apps

| App | Port | Description |
|-----|------|-------------|
| Home Assistant | 8123 | Open-source home automation platform |
| qBittorrent | 8080 | BitTorrent client with web UI |
| Prowlarr | 9696 | Indexer manager for the *Arr stack |
| Radarr | 7878 | Movie collection manager |
| Sonarr | 8989 | TV series collection manager |
| Bazarr | 6767 | Subtitle manager for Sonarr and Radarr |
| Lidarr | 8686 | Music collection manager |
| Jellyseerr | 5055 | Media request manager for Jellyfin (legacy) |
| Seerr | 5055 | Media request manager for Jellyfin (recommended, successor to Jellyseerr) |
| Homarr | 7575 | Customizable dashboard for your server |
| Jellyfin | 8096 | Free media streaming server |
| Navidrome | 4533 | Modern music server and streamer |
| DuckDNS | — | Free dynamic DNS service |
| WireGuard | 51820/udp | Fast, modern VPN tunnel |
| Uptime Kuma | 3001 | Self-hosted monitoring tool |

Jellyseerr and Seerr conflict with each other (both use port 5055) — only one can be installed at a time.

## TODO

- [ ] Replace Uptime Kuma with Gatus which has support for file based configuration (could allow to setup alerts and monitoring directly in the script without using the UI)
- [ ] Check if Profilarr is a good solution for quality profiles

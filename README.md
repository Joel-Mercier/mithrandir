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

### Rclone configuration
You can setup remote backups by running `rclone config` in the terminal after running the setup wizard. This will set up the remote connection to your Google Drive. Make sure the remote name matches the `RCLONE_REMOTE` setting in `backup.conf`. If you run a desktopless linux server, you'll need to execute a rclone command on another device with a browser to complete the remote setup. The documentation to setup a Google Drive remote with rclone is [here](https://rclone.org/drive/#making-your-own-client-id).

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
Interactive multi-step wizard: installs Docker and rclone, prompts for base directory, lets you pick services to install, auto configures the installed services, configures the systemd backup timer, and prints a summary with service URLs. `--yes` skips all prompts, selects all apps, and uses defaults from `.env`.

**Backup:**
```bash
sudo mithrandir backup
```
Backs up all configured apps. In a terminal it shows spinners and colored progress; from systemd (non-TTY) it writes timestamped plaintext to stdout and `/var/log/homelab-backup.log`.

**List backups:**
```bash
sudo mithrandir backup list [local|remote]
```
Lists existing backups with their contents. Without an argument, shows both local and remote backups.

Examples:
```bash
sudo mithrandir backup list                # List both local and remote backups
sudo mithrandir backup list local          # List only local backups
sudo mithrandir backup list remote         # List only remote backups
```

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

**Verify backups:**
```bash
sudo mithrandir backup verify [YYYY-MM-DD] [--remote] [--extract]
```
Checks archive integrity, validates expected files are present (docker-compose.yml, config dirs), and reports file sizes. Without a date, verifies the most recent backup.
- `--remote`: Verify remote backups (downloads to temp dir, verifies, cleans up)
- `--extract`: Also perform a test extraction to a temp directory

Examples:
```bash
sudo mithrandir backup verify                              # Verify most recent local backup
sudo mithrandir backup verify 2025-06-01                   # Verify a specific date
sudo mithrandir backup verify --remote                     # Verify most recent remote backup
sudo mithrandir backup verify --remote --extract           # Verify remote with extract test
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

**Disaster recovery:**
```bash
sudo mithrandir recover [--yes]
```
Full disaster recovery for a fresh system (new server, reinstalled OS). Automates the entire process: installs Docker and rclone, verifies the rclone remote is configured, sets up the base directory, discovers the latest remote backup, restores secrets and all app configs, regenerates docker-compose files, starts all containers, and installs the backup timer. Unlike `restore` (which assumes Docker and compose files already exist), `recover` bootstraps everything from scratch.

In interactive mode, prompts for confirmation at each step. In `--yes` mode, uses all defaults and fails if the rclone remote isn't configured.

Examples:
```bash
sudo mithrandir recover                  # Interactive recovery
sudo mithrandir recover --yes            # Automated recovery with defaults
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

**View logs:**
```bash
sudo mithrandir log <app> [--follow] [--tail N] [--since TIME]
```
Streams Docker container logs to the terminal. Supports following output in real time, limiting the number of lines shown, and filtering by time.

Examples:
```bash
sudo mithrandir log radarr                           # Show all logs
sudo mithrandir log radarr --follow                  # Follow log output
sudo mithrandir log radarr --tail 100                # Show last 100 lines
sudo mithrandir log radarr --follow --tail 50        # Follow, starting from last 50 lines
sudo mithrandir log jellyfin --since 1h              # Logs from the last hour
```

**Start an app:**
```bash
sudo mithrandir start <app>
```
Starts a stopped app container. The app must already be installed (docker-compose.yml exists).

**Stop an app:**
```bash
sudo mithrandir stop <app>
```
Stops a running app container.

**Restart an app:**
```bash
sudo mithrandir restart <app>
```
Stops and restarts a running app container.

**Install an app:**
```bash
sudo mithrandir install <app>
```
Installs a single app: pulls the Docker image, creates directories, generates docker-compose.yml, and starts the container. The app must not already be installed.

**Install Docker:**
```bash
sudo mithrandir install docker
```
Installs Docker engine on the host. If Docker is already installed and running, reports the existing installation. Equivalent to the Docker installation step in the setup wizard.

**Install backup system:**
```bash
sudo mithrandir install backup
```
Installs rclone (for remote backups to Google Drive) and sets up the systemd backup timer (daily at 2:00 AM). Skips components that are already installed. Equivalent to the rclone and backup timer steps in the setup wizard.

**Reinstall an app:**
```bash
sudo mithrandir reinstall <app> [--yes]
```
Completely reinstalls an app: stops the container, removes the Docker image, optionally deletes app data, then recreates directories, generates a fresh docker-compose.yml, pulls the image, and starts the container. `--yes` skips the data deletion prompt (deletes data without asking).

Examples:
```bash
sudo mithrandir reinstall radarr             # Reinstall, prompt before deleting data
sudo mithrandir reinstall radarr --yes       # Reinstall, delete data without prompting
```

**Self-update:**
```bash
sudo mithrandir self-update
```
Pulls the latest code from git, installs any new dependencies, and rebuilds the CLI. Since `/usr/local/bin/mithrandir` is a symlink to the built file, no reinstall is needed.

The CLI also checks for updates automatically once every 24 hours. When a newer version is available on the remote, a yellow notice is printed after the command output:
```
Update available (3 commits behind). Run `mithrandir self-update` to update.
```
The check runs concurrently with the command so it doesn't add latency. The last check timestamp is cached in `~/.cache/mithrandir/last-update-check`. The check is skipped for `self-update`, `version`, and `completions` commands.

**Version:**
```bash
mithrandir version
```
Prints the CLI version and short git commit hash, e.g. `mithrandir v1.0.0 (abc1234)`. Also available via `mithrandir --version` (version number only).

**Config:**
```bash
mithrandir config
```
Pretty-prints the current `.env` and `backup.conf` settings. Shows file paths so you know where to edit. Tokens and secrets are masked.

**Shell completions:**
```bash
mithrandir completions <bash|zsh|fish>
```
Generates a shell completion script for the specified shell. Covers all subcommands, app names, flags, and backup/restore sub-arguments.

Examples:
```bash
eval "$(mithrandir completions bash)"                  # Bash (add to ~/.bashrc)
eval "$(mithrandir completions zsh)"                   # Zsh (add to ~/.zshrc)
mithrandir completions fish | source                   # Fish (add to config.fish)
```

**Status check:**
```bash
sudo mithrandir status
```
Displays the status of all homelab components: installed apps, running containers, backup info, and disk usage.

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
| Seerr | 5055 | Media request manager for Jellyfin |
| Homarr | 7575 | Customizable dashboard for your server |
| Jellyfin | 8096 | Free media streaming server |
| Navidrome | 4533 | Modern music server and streamer |
| DuckDNS | — | Free dynamic DNS service |
| WireGuard | 51820/udp | Fast, modern VPN tunnel |
| Gatus | 3001 | Automated service health monitoring |

## TODO

- [ ] Check if Profilarr is a good solution for quality profiles

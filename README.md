# Mithrandir - Home Lab Setup

Automated setup and backup system for Docker-based homelab applications.

## Quick Start

```bash
git clone <repo> && cd mithrandir
sudo bash install.sh          # Installs Bun + dependencies
mithrandir setup              # No sudo needed — CLI elevates internally when required
```

**Documentation website:** https://joel-mercier.github.io/mithrandir/

> [!WARNING]
> This project is being developed with the help of LLMs and agentic coding. Altough I'm a professional software developer, I'm more experienced in developing websites and mobile apps.

> [!WARNING]
> Mithrandir has for now only been tested on a Raspberry Pi 5 with 4GB RAM and running Raspberry Pi OS in headless mode. It may not work on other hardware or operating systems.

## Configuration

### .env File
All configuration lives in a single `.env` file at the project root.

**Core settings:**
- `BASE_DIR`: Base directory where Docker app folders are located (e.g., `/opt/docker`)
- `PUID`/`PGID`: User/group IDs for Docker containers (default: `1000`)
- `TZ`: Timezone (default: `Etc/UTC`)

**Backup settings:**
- `BACKUP_DIR`: Local backup storage directory (default: `/backups`)
- `LOCAL_RETENTION`: Number of local backups to keep (default: `5`)
- `REMOTE_RETENTION`: Number of Google Drive backups to keep (default: `10`)
- `RCLONE_REMOTE`: rclone remote name for Google Drive (default: `gdrive`)
- `APPS`: Apps to backup - `"auto"` to detect installed apps, or comma-separated list
- `BACKUP_PASSWORD`: Optional encryption password — when set, backups are encrypted with AES-256-CBC

**HTTPS settings (Caddy reverse proxy):**
- `ENABLE_HTTPS`: Set to `true` when HTTPS is installed (managed by `install https`)
- `ACME_EMAIL`: Email for Let's Encrypt certificate notifications

**Per-app secrets:**
- `DUCKDNS_SUBDOMAINS`, `DUCKDNS_TOKEN`: Required for DuckDNS
- `WG_SERVERURL`: Required for WireGuard
- `WG_PEERS`: Number of WireGuard peers (default: `1`)
- `ND_SPOTIFY_ID`, `ND_SPOTIFY_SECRET`: Optional for Navidrome artist images
- `SURE_SECRET_KEY_BASE`: Required Rails secret for Sure
- `SURE_DB_PASSWORD`: Optional database password for Sure
- `AFFINE_DB_PASSWORD`: Optional database password for AFFiNE
- `AFFINE_DB_USERNAME`: Optional database username for AFFiNE (default: `affine`)
- `PIHOLE_PASSWORD`: Optional web interface password for Pi-hole
- `GATUS_DISCORD_WEBHOOK_URL`: Optional Discord webhook URL for Gatus alerts

### Rclone configuration
You can setup remote backups by running `rclone config` in the terminal after running the setup wizard. This will set up the remote connection to your Google Drive. Make sure the remote name matches the `RCLONE_REMOTE` setting in `.env`. If you run a desktopless linux server, you'll need to execute a rclone command on another device with a browser to complete the remote setup. The documentation to setup a Google Drive remote with rclone is [here](https://rclone.org/drive/#making-your-own-client-id).

### Systemd Service

Automatically generated and installed by setup to `/etc/systemd/system/`:
- **Service**: `homelab-backup.service`
  - Runs backup as a oneshot service
  - Path is automatically configured during setup
- **Timer**: `homelab-backup.timer`
  - Runs daily at 2:00 AM with 0-30 minute randomization
  - Persistent: runs immediately if system was off during scheduled time

## Usage

The CLI requires Bun. Run `sudo bash install.sh` first to install Bun, build the CLI, and install the `mithrandir` command on a bare Debian/Ubuntu server.

**Privilege handling:** Most commands work without `sudo` when your user is in the `docker` group. The CLI uses `sudo` internally only for system operations (apt, systemd, UFW). During initial setup, Docker is installed and your user is added to the `docker` group automatically — log out and back in for it to take effect. Until then, the CLI transparently falls back to `sudo` for Docker operations.

**Setup wizard:**
```bash
mithrandir setup [--yes]
```
Interactive multi-step wizard: installs Docker and rclone, prompts for base directory, lets you pick services to install, auto configures the installed services, configures the systemd backup timer, and prints a summary with service URLs. `--yes` skips all prompts, selects all apps, and uses defaults from `.env`.

**Backup:**
```bash
mithrandir backup
```
Backs up all configured apps. In a terminal it shows spinners and colored progress; from systemd (non-TTY) it writes timestamped plaintext to stdout and `/var/log/homelab-backup.log`.

**List backups:**
```bash
mithrandir backup list [local|remote]
```
Lists existing backups with their contents. Without an argument, shows both local and remote backups.

Examples:
```bash
mithrandir backup list                # List both local and remote backups
mithrandir backup list local          # List only local backups
mithrandir backup list remote         # List only remote backups
```

**Delete backups:**
```bash
mithrandir backup delete <local|remote> [YYYY-MM-DD] [--yes]
```
- `local`: Delete local backups from the archive directory
- `remote`: Delete remote backups via rclone
- `YYYY-MM-DD`: Optional date — deletes only that date's backup. Without a date, deletes all backups
- `--yes`: Skip confirmation prompt

Examples:
```bash
mithrandir backup delete local                  # Delete all local backups
mithrandir backup delete local 2025-06-01       # Delete a specific local backup
mithrandir backup delete remote --yes           # Delete all remote backups (no prompt)
mithrandir backup delete remote 2025-06-01      # Delete a specific remote backup
```

**Verify backups:**
```bash
mithrandir backup verify [YYYY-MM-DD] [--remote] [--extract]
```
Checks archive integrity, validates expected files are present (docker-compose.yml, config dirs), and reports file sizes. Without a date, verifies the most recent backup.
- `--remote`: Verify remote backups (downloads to temp dir, verifies, cleans up)
- `--extract`: Also perform a test extraction to a temp directory

Examples:
```bash
mithrandir backup verify                              # Verify most recent local backup
mithrandir backup verify 2025-06-01                   # Verify a specific date
mithrandir backup verify --remote                     # Verify most recent remote backup
mithrandir backup verify --remote --extract           # Verify remote with extract test
```

**Restore:**
```bash
mithrandir restore <app|full> [date] [--yes]
```
- `app`: Name of app to restore (e.g., `jellyfin`, `radarr`, `sonarr`)
- `full`: Restore all apps and secrets
- `date`: Backup date in `YYYY-MM-DD` format (default: `latest`)
- `--yes`: Skip confirmation prompts

Examples:
```bash
mithrandir restore jellyfin
mithrandir restore jellyfin 2025-01-01
mithrandir restore full
mithrandir restore full 2025-01-01 --yes
```

**Disaster recovery:**
```bash
mithrandir recover [--yes]
```
Full disaster recovery for a fresh system (new server, reinstalled OS). Automates the entire process: installs Docker and rclone, verifies the rclone remote is configured, sets up the base directory, discovers the latest remote backup, restores secrets and all app configs, regenerates docker-compose files, starts all containers, and installs the backup timer. Unlike `restore` (which assumes Docker and compose files already exist), `recover` bootstraps everything from scratch.

In interactive mode, prompts for confirmation at each step. In `--yes` mode, uses all defaults and fails if the rclone remote isn't configured.

Examples:
```bash
mithrandir recover                  # Interactive recovery
mithrandir recover --yes            # Automated recovery with defaults
```

**Uninstall an app:**
```bash
mithrandir uninstall <app>
```
Stops and removes the container. Prompts whether to also delete the app's data and configuration.

**Full system uninstall:**
```bash
mithrandir uninstall
```
Removes all Homelab components: Docker, backup systemd timer, rclone, local backups, and app data directories.

**Update containers:**
```bash
mithrandir update [app] [--yes]
```
Pulls the latest Docker images for installed apps and recreates containers that have newer images available. Optionally backs up apps before updating. Without an app name, updates all installed apps. `--yes` skips the backup confirmation prompt.

Examples:
```bash
mithrandir update                       # Update all installed apps
mithrandir update radarr                # Update only Radarr
mithrandir update --yes                 # Update all, skip backup prompt
```

**View logs:**
```bash
mithrandir log <app> [--follow] [--tail N] [--since TIME]
```
Streams Docker container logs to the terminal. Supports following output in real time, limiting the number of lines shown, and filtering by time.

Examples:
```bash
mithrandir log radarr                           # Show all logs
mithrandir log radarr --follow                  # Follow log output
mithrandir log radarr --tail 100                # Show last 100 lines
mithrandir log radarr --follow --tail 50        # Follow, starting from last 50 lines
mithrandir log jellyfin --since 1h              # Logs from the last hour
```

**Start an app:**
```bash
mithrandir start <app>
```
Starts a stopped app container. The app must already be installed (docker-compose.yml exists).

**Stop an app:**
```bash
mithrandir stop <app>
```
Stops a running app container.

**Restart an app:**
```bash
mithrandir restart <app>
```
Stops and restarts a running app container.

**Install an app:**
```bash
mithrandir install <app>
```
Installs a single app: pulls the Docker image, creates directories, generates docker-compose.yml, and starts the container. The app must not already be installed.

**Install a stack:**
```bash
mithrandir install <stack>
```
Installs a predefined group of apps in one command. Already-installed apps are skipped. Companion apps are included automatically.

Available stacks: `media`, `media-movies-tv`, `media-music`, `media-pictures`, `security`

Examples:
```bash
mithrandir install media-movies-tv    # qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin
mithrandir install security           # Caddy, Pi-hole
```

**Install Docker:**
```bash
mithrandir install docker
```
Installs Docker engine on the host. If Docker is already installed and running, reports the existing installation. Equivalent to the Docker installation step in the setup wizard.

**Install backup system:**
```bash
mithrandir install backup
```
Installs rclone (for remote backups to Google Drive) and sets up the systemd backup timer (daily at 2:00 AM). Skips components that are already installed. Equivalent to the rclone and backup timer steps in the setup wizard.

**Install HTTPS:**
```bash
mithrandir install https
```
Sets up HTTPS for all installed apps using Caddy as a reverse proxy with automatic Let's Encrypt certificates via DuckDNS DNS-01 challenge. Requires the DuckDNS app to be installed and running first.

What it does:
1. Prompts for an ACME email (used by Let's Encrypt for certificate expiry warnings)
2. Builds a custom Caddy Docker image with the DuckDNS DNS module
3. Generates a Caddyfile with reverse proxy entries for all installed apps
4. Starts the Caddy container on port 443
5. If Pi-hole is installed, restarts it without port 443 (Caddy takes over)

After installation, apps are accessible at `https://appname.yourdomain.duckdns.org`. The Caddyfile is automatically regenerated whenever you install or uninstall an app.

**DNS setup required:** DuckDNS only creates an A record for the base domain (e.g. `yourdomain.duckdns.org`), not wildcard subdomains. You need to add a wildcard DNS entry on your router pointing `*.yourdomain.duckdns.org` to your server's LAN IP. How to do this depends on your router (OpenWrt, pfSense, UniFi all support custom DNS entries).

**Reinstall an app:**
```bash
mithrandir reinstall <app> [--yes]
```
Completely reinstalls an app: stops the container, removes the Docker image, optionally deletes app data, then recreates directories, generates a fresh docker-compose.yml, pulls the image, and starts the container. `--yes` skips the data deletion prompt (deletes data without asking).

Examples:
```bash
mithrandir reinstall radarr             # Reinstall, prompt before deleting data
mithrandir reinstall radarr --yes       # Reinstall, delete data without prompting
```

**Self-update:**
```bash
mithrandir self-update
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
Pretty-prints the current `.env` settings. Shows the file path so you know where to edit. Tokens and secrets are masked.

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

**Documentation site:**
```bash
mithrandir docs              # Build and serve docs website
mithrandir docs stop         # Stop docs website
bun run docs:dev                  # Local dev server (hot reload)
```

**Dependency graph:**
```bash
mithrandir graph
```
Shows the inter-app dependency tree with color-coded installation status (green = installed, dim = not installed). Includes the media pipeline data flow, network/security dependencies, standalone apps, and recommended installation order for the Arr stack.

**Status check:**
```bash
mithrandir status
```
Displays the status of all homelab components: installed apps, running containers, backup info, and disk usage.

**Health check:**
```bash
mithrandir health
```
Validates system health across five dimensions: Docker daemon, disk space (warn at 80%, fail at 95%), backup age (warn >2 days, fail >7 days), container restart loops (fail if RestartCount >5 or status "restarting"), and remote backup connectivity via rclone. Exit code 0 if all pass/warn, 1 if any fail — useful for monitoring and automation.

**Doctor (diagnose setup issues):**
```bash
mithrandir doctor
```
Checks configuration correctness across three categories: System (.env file, Docker installation and daemon), Apps (stopped containers, missing config directories, missing required/optional secrets), and Backup (backup directory, systemd service and timer, rclone installation and remote configuration). Each failing or warning check includes an actionable hint with the command to fix it. Backup checks are skipped if no apps are installed. Exit code 1 if any check fails.

## Available Apps

| App | Port | Description |
|-----|------|-------------|
| Home Assistant | 8123 | Open-source home automation platform |
| qBittorrent | 8080 | BitTorrent client with web UI |
| Prowlarr | 9696 | Indexer manager for the *Arr stack (also installs Flaresolverr) |
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
| Immich | 2283 | Self-hosted photo and video management |
| Caddy | — | HTTPS reverse proxy with automatic certificates (hidden, installed via `install https`) |
| Pi-hole | 80 | Network-wide ad blocker and DNS server |
| n8n | 5678 | Workflow automation platform |
| AFFiNE | 3010 | Privacy-focused knowledge base and workspace |
| Excalidraw | 5000 | Virtual whiteboard for sketching |
| Omni Tools | 8079 | Collection of useful productivity tools |
| Open WebUI | 3000 | Self-hosted AI chat interface |
| Vaultwarden | 8222 | Lightweight Bitwarden-compatible password manager (requires HTTPS) |
| Actual Budget | 5006 | Privacy-focused personal finance and budgeting app |
| Sure | 3005 | Privacy-focused personal finance tracker |

## Local Development

```bash
git clone <repo> && cd mithrandir
bun install
```

**Creating a release:**
```bash
scripts/release.sh 1.1.0    # Bumps version, generates changelog, commits, and tags
git push && git push --tags  # Push the release
```

The release script bumps the version in `package.json` and `docs/.vitepress/config.ts`, regenerates `docs/changelog.md` from git tags, creates a commit, and tags it. The changelog groups commits by tag, with unreleased commits shown at the top.

You can also regenerate the changelog manually at any time:
```bash
scripts/generate-changelog.sh
```

**Available scripts:**

| Command | Description |
|---------|-------------|
| `bun run start` | Run the CLI in dev mode (unbundled) |
| `bun run build` | Bundle into `dist/mithrandir.js` |
| `bun run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `bun run docs:dev` | Local VitePress dev server with hot reload |
| `bun run docs:build` | Build the documentation site for production |
| `bun run docs:preview` | Preview the built documentation site |
| `bun run release <version>` | Create a new release |

## TODO

- [ ] Add screenshots to the docs
- [ ] Make sure that empty env vars in .env are considered as not set and not as empty strings since this might cause issues with some apps where a value is expected
- [ ] Add penpot to the list of installable apps in @src/lib/apps.ts. It should be in the "Productivity" category.
https://help.penpot.app/technical-guide/getting-started/docker/
- [ ] Setup a local test environment with docker. This would allow us to test the CLI on a wider range of hardware and operating systems, and also help us catch any regressions before releasing a new version.
- [ ] I want to internationalize this project's documentation that is built with VitePress. Here is the official documentation: https://vitepress.dev/guide/i18n. For now I just want to add a French translation.
- [ ] check in prowlarr torznab (U2P / utopeer)
- [ ] Add a \[CERTIFICATE_EXPIRATION\] > 72h check for each app during the Gatus setup to warn the user if their certificate is about to expire. Caddy is handling the certificate renewal automatically.
- [ ] Check if Profilarr is a good solution for quality profiles

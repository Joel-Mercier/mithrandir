# Mithrandir - Home Lab Setup

Automated setup and backup system for Docker-based homelab applications.

![GitHub package.json version](https://img.shields.io/github/package-json/v/Joel-Mercier/mithrandir)
![GitHub Release](https://img.shields.io/github/v/release/Joel-Mercier/mithrandir)
![GitHub deployments](https://img.shields.io/github/deployments/Joel-Mercier/mithrandir/github-pages)
![GitHub License](https://img.shields.io/github/license/Joel-Mercier/mithrandir)
![GitHub last commit](https://img.shields.io/github/last-commit/Joel-Mercier/mithrandir)
[![CI](https://github.com/Joel-Mercier/mithrandir/actions/workflows/ci.yml/badge.svg)](https://github.com/Joel-Mercier/mithrandir/actions/workflows/ci.yml)
[![Deploy VitePress site to Pages](https://github.com/Joel-Mercier/mithrandir/actions/workflows/deploy.yml/badge.svg)](https://github.com/Joel-Mercier/mithrandir/actions/workflows/deploy.yml)

> [!WARNING]
> This project is being developed with the help of LLMs and agentic coding. Although I'm a professional software developer, I'm more experienced in developing websites and mobile apps.

> [!WARNING]
> Mithrandir has for now only been tested on a Raspberry Pi 5 with 4GB RAM and running Raspberry Pi OS in headless mode. It may not work on other hardware or operating systems.

**Documentation website:** https://joel-mercier.github.io/mithrandir/

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Available Apps](#available-apps)
- [Web Dashboard (UI)](#web-dashboard-ui)
- [Local Development](#local-development)
- [Testing](#testing)

## Quick Start

```bash
git clone https://github.com/Joel-Mercier/mithrandir.git && cd mithrandir
sudo bash install.sh          # Installs Bun + dependencies
mithrandir setup              # No sudo needed — CLI elevates internally when required
```

## Configuration

### .env File
All configuration lives in a single `.env` file at the project root.

**Core settings:**
- `BASE_DIR`: Base directory where Docker app folders are located (e.g., `/opt/docker`)
- `PUID`/`PGID`: User/group IDs for Docker containers (default: `1000`)
- `TZ`: Timezone (default: `Etc/UTC`)
- `LOCAL_IP`: Local IP address (auto-detected if not set)
- `AUTO_YES`: Set to `true` to automatically accept all prompts (default: `false`)

**Backup settings:**
- `BACKUP_DIR`: Local backup storage directory (default: `/backups`)
- `LOCAL_RETENTION`: Number of local backups to keep (default: `5`)
- `REMOTE_RETENTION`: Number of remote backups to keep (default: `10`)
- `RCLONE_REMOTES`: Comma-separated list of rclone remote names for cloud backups (default: `gdrive`)
- `APPS`: Apps to backup - `"auto"` to detect installed apps, or comma-separated list
- `BACKUP_HOUR`: Hour of the day when automatic backups run (0-23, default: `2` for 2:00 AM)
- `BACKUP_PASSWORD`: Optional encryption password — when set, backups are encrypted with AES-256-CBC

**HTTPS settings (Caddy reverse proxy):**
- `ENABLE_HTTPS`: Set to `true` when HTTPS is installed (managed by `install https`)
- `ACME_EMAIL`: Email for Let's Encrypt certificate notifications

**Firewall settings:**
- `ENABLE_FIREWALL`: Set to `true` when UFW firewall is installed (managed by `install firewall`)

**SSO settings:**
- `ENABLE_SSO`: Set to `true` to enable the Mithrandir UI as an OAuth/OIDC provider for homelab apps (default: `false`)

**Per-app secrets:**
- `DUCKDNS_SUBDOMAINS`, `DUCKDNS_TOKEN`: Required for DuckDNS
- `WG_SERVERURL`: Required for WireGuard
- `WG_PEERS`: Number of WireGuard peers (default: `1`)
- `IMMICH_DB_PASSWORD`: Optional database password for Immich (default: `postgres`)
- `SURE_SECRET_KEY_BASE`: Required Rails secret for Sure
- `SURE_DB_PASSWORD`: Optional database password for Sure
- `SURE_OPENAI_ACCESS_TOKEN`: Optional OpenAI access token for Sure AI features
- `SURE_OPENAI_URI_BASE`: Optional OpenAI API base URI for Sure
- `SURE_OPENAI_MODEL`: Optional OpenAI model name for Sure
- `AFFINE_DB_PASSWORD`: Optional database password for AFFiNE
- `AFFINE_DB_USERNAME`: Optional database username for AFFiNE (default: `affine`)
- `PAPERLESS_OCR_LANGUAGE`: OCR language for Paperless-ngx (default: `eng`)
- `PENPOT_SECRET_KEY`: Required secret key for Penpot
- `PENPOT_DB_PASSWORD`: Optional database password for Penpot
- `PENPOT_PUBLIC_URI`: Optional public URI for Penpot (default: `http://localhost:9001`)
- `ADVENTURELOG_SECRET_KEY`: Required Django secret key for AdventureLog
- `ADVENTURELOG_DB_PASSWORD`: Optional database password for AdventureLog
- `ADVENTURELOG_ADMIN_USERNAME`: Optional admin username for AdventureLog (default: `admin`)
- `ADVENTURELOG_ADMIN_PASSWORD`: Optional admin password for AdventureLog
- `ADVENTURELOG_ADMIN_EMAIL`: Optional admin email for AdventureLog
- `PIHOLE_PASSWORD`: Optional web interface password for Pi-hole
- `YOURSPOTIFY_CLIENT_ID`: Required Spotify Client ID for Your Spotify
- `YOURSPOTIFY_CLIENT_SECRET`: Required Spotify Client Secret for Your Spotify
- `TANDOOR_SECRET_KEY`: Required secret key for Tandoor (auto-generated during install)
- `TANDOOR_DB_PASSWORD`: Optional database password for Tandoor (default: `tandoor`)
- `MEALIE_DB_PASSWORD`: Optional database password for Mealie
- `YOUTARR_AUTH_USERNAME`: Required admin username for Youtarr
- `YOUTARR_AUTH_PASSWORD`: Required admin password for Youtarr
- `YOUTARR_DB_PASSWORD`: Optional database password for Youtarr
- `GATUS_DISCORD_WEBHOOK_URL`: Optional Discord webhook URL for Gatus alerts

### Rclone configuration
Mithrandir uses [rclone](https://rclone.org) to sync backups to one or more cloud storage providers. Supported providers include Google Drive, SFTP, S3, Dropbox, OneDrive, and iCloud Drive.

**Add a remote interactively:**
```bash
mithrandir backup remote add
```
This guided wizard walks you through selecting a provider, entering credentials, and testing connectivity. The remote is automatically added to `RCLONE_REMOTES` in `.env`.

**Manage remotes:**
```bash
mithrandir backup remote list       # Show configured remotes with status
mithrandir backup remote remove     # Remove a remote
```

Alternatively, run `rclone config` manually and ensure the remote name is listed in `RCLONE_REMOTES` in `.env`.

**Google Drive auto-configuration:**
Set all three values to auto-generate `rclone.conf` without running `rclone config` manually:
- `RCLONE_GDRIVE_APP_ID`: Google Drive OAuth client ID ([create your own](https://rclone.org/drive/#making-your-own-client-id))
- `RCLONE_GDRIVE_APP_SECRET`: Google Drive OAuth client secret
- `RCLONE_GDRIVE_TOKEN`: Google Drive OAuth token

> **Headless servers:** OAuth-based providers (Google Drive, Dropbox, OneDrive) require a browser for initial authorization. Run `rclone authorize "<provider>"` on a machine with a browser, then paste the resulting token during `mithrandir backup remote add`. This is a one-time setup — automated backups work without a browser afterward.

### Systemd Service

Automatically generated and installed by setup to `/etc/systemd/system/`:
- **Service**: `homelab-backup.service`
  - Runs backup as a oneshot service
  - Path is automatically configured during setup
- **Timer**: `homelab-backup.timer`
  - Runs daily at the configured hour (default: 2:00 AM) with 0-30 minute randomization
  - Configurable via `BACKUP_HOUR` env var or `mithrandir backup config`
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

**Configure backup settings:**
```bash
mithrandir backup config
```
Interactive command to view and edit all backup settings: backup directory, retention counts, rclone remotes, apps to backup, backup hour, and encryption password. Saves changes to `.env` and updates the systemd timer automatically if the backup hour changes.

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
Full disaster recovery for a fresh system (new server, reinstalled OS). Automates the entire process: installs Docker and rclone, verifies rclone remotes are configured, sets up the base directory, discovers the latest remote backup (trying each configured remote in order), restores secrets and all app configs, regenerates docker-compose files, starts all containers, and installs the backup timer. Unlike `restore` (which assumes Docker and compose files already exist), `recover` bootstraps everything from scratch.

In interactive mode, prompts for confirmation at each step. In `--yes` mode, uses all defaults and fails if no rclone remote is configured.

Examples:
```bash
mithrandir recover                  # Interactive recovery
mithrandir recover --yes            # Automated recovery with defaults
```

**Uninstall an app:**
```bash
mithrandir uninstall <app>
```
Stops and removes the container and companion apps. Prompts whether to also delete the app's data and configuration.

**Full system removal:**
```bash
mithrandir uninstall
```
Guided 9-step removal with per-step prompts. Each destructive step (backups, rclone, app data, Docker, .env config) can be individually accepted or skipped, allowing you to keep Docker and apps running independently. Removes all Mithrandir systemd services (backup, UI, tusd), log files, CLI symlink, and cache. Also available from the web dashboard under Settings > General > Danger Zone.

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

Available stacks: `media`, `media-movies-tv`, `media-audio`, `media-pictures`, `media-games`, `security`

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
Installs rclone (for remote backups to cloud storage) and sets up the systemd backup timer (daily at 2:00 AM). Skips components that are already installed. Equivalent to the rclone and backup timer steps in the setup wizard.

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

**Capacity planning:**
```bash
mithrandir capacity
```
Shows system hardware info (CPU, RAM, disk), per-app resource impact scores, and aggregate capacity verdicts. Helps you understand when your homelab is nearing its limits.

**Doctor (diagnose setup issues):**
```bash
mithrandir doctor
```
Checks configuration correctness across three categories: System (.env file, Docker installation and daemon), Apps (stopped containers, missing config directories, missing required/optional secrets), and Backup (backup directory, systemd service and timer, rclone installation and remote configuration). Each failing or warning check includes an actionable hint with the command to fix it. Backup checks are skipped if no apps are installed. Exit code 1 if any check fails.

## Available Apps

| App            | Port      | Description                                                                             |
| -------------- | --------- | --------------------------------------------------------------------------------------- |
| Actual Budget    | 5006      | Privacy-focused personal finance and budgeting app                                      |
| Audiobookshelf   | 13378     | Self-hosted audiobook and podcast server                                                |
| AdventureLog     | 8015      | Travel planning and adventure journal                                                   |
| AFFiNE         | 3010      | Privacy-focused knowledge base and workspace                                            |
| Bazarr         | 6767      | Subtitle manager for Sonarr and Radarr                                                  |
| Caddy          | —         | HTTPS reverse proxy with automatic certificates (hidden, installed via `install https`) |
| CookCLI        | 9080      | Recipe manager using the Cooklang markup language                                       |
| Mealie         | 9925      | Self-hosted recipe manager and meal planner                                             |
| Memos          | 5230      | Lightweight self-hosted memo hub and knowledge management                               |
| DuckDNS        | —         | Free dynamic DNS service                                                                |
| Excalidraw     | 5000      | Virtual whiteboard for sketching                                                        |
| Gatus          | 3001      | Automated service health monitoring                                                     |
| Glance         | 8082      | Self-hosted dashboard with various widgets                                              |
| Home Assistant | 8123      | Open-source home automation platform                                                    |
| Homarr         | 7575      | Customizable dashboard for your server                                                  |
| Immich         | 2283      | Self-hosted photo and video management                                                  |
| Jellyfin       | 8096      | Free media streaming server                                                             |
| Lidarr         | 8686      | Music collection manager                                                                |
| n8n            | 5678      | Workflow automation platform                                                            |
| Navidrome      | 4533      | Modern music server and streamer                                                        |
| Omni Tools     | 8079      | Collection of useful productivity tools                                                 |
| Open WebUI     | 3000      | Self-hosted AI chat interface                                                           |
| Paperless-ngx  | 8000      | Document management system with OCR                                                     |
| Penpot         | 9001      | Open-source design and prototyping platform                                             |
| Pi-hole        | 80        | Network-wide ad blocker and DNS server                                                  |
| Profilarr      | 6868      | Quality profile manager for Radarr and Sonarr                                           |
| Prowlarr       | 9696      | Indexer manager for the *Arr stack (also installs Flaresolverr)                         |
| qBittorrent    | 8080      | BitTorrent client with web UI                                                           |
| Radarr         | 7878      | Movie collection manager                                                                |
| RetroAssembly  | 8001      | Personal retro game collection cabinet in your browser                                   |
| Seerr          | 5055      | Media request manager for Jellyfin                                                      |
| Sonarr         | 8989      | TV series collection manager                                                            |
| Stirling PDF   | 8084      | All-in-one PDF manipulation tool                                                        |
| Sure           | 3005      | Privacy-focused personal finance tracker                                                |
| Tandoor        | 9010      | Recipe manager and meal planner with shopping lists                                     |
| TRIP           | 8085      | Travel planning and trip journal                                                        |
| Vaultwarden    | 8222      | Lightweight Bitwarden-compatible password manager (requires HTTPS)                      |
| WireGuard      | 51820/udp | Fast, modern VPN tunnel                                                                 |
| Youtarr        | 3087      | YouTube video downloader and manager                                                    |
| Your Spotify   | 3456      | Spotify listening statistics and history tracker                                        |


## Web Dashboard (UI)

Mithrandir includes a web-based dashboard for managing your homelab from a browser. It provides the same capabilities as the CLI in a visual interface.

**Tech stack:** TanStack Start (SSR) + React 19 + Vite, styled with Tailwind CSS v4 and shadcn/ui components. Authentication via Better-Auth with email/password, optional two-factor (TOTP), and optional OIDC SSO (Authentik, Keycloak, Authelia, etc.). Data is stored in a local SQLite database via Drizzle ORM. Internationalized with Paraglide (English and French).

**Features:**

- **Dashboard** — Overview of system status, installed apps, backup status, resource usage, and configuration at a glance. Includes a doctor dialog for diagnosing issues.
- **App management** — Browse all available apps with search and category filtering, view app details, install/uninstall/start/stop/restart apps, and stream container logs in real time.
- **Dependency graph** — Visual representation of inter-app dependencies with installation status.
- **Capacity planning** — System resource overview with per-app performance and storage scores, rendered with score rings and storage meters.
- **Backup & restore** — View local and remote backups, trigger backups, and restore apps or full system from the UI.
- **Setup wizard** — Step-by-step guided setup with the same workflow as the CLI wizard.
- **Media library** — Browse media files on the server with a file tree viewer.
- **File upload** — Upload files to the server via resumable uploads (tus protocol with Uppy).
- **Settings** — Configure general, backup, and network settings. View system information. Includes a Danger Zone for complete system removal with per-step prompts.
- **User profile** — Manage account, active sessions, and two-factor authentication.
- **Self-update** — Update Mithrandir from git directly in the browser with a step-by-step progress view.
- **Dark mode** — Light, dark, and auto themes with a toggle in the header.

**Deployment:**

The UI runs in production as two systemd services:

- **`mithrandir-ui.service`** — Serves the TanStack Start SSR app on port 4180. Runs database migrations on startup, loads env vars from both `.env` and `ui/.env.local`.
- **`mithrandir-tusd.service`** — Runs [tusd](https://tus.io/), a resumable upload server, on port 1080. Handles chunked file uploads and forwards lifecycle hooks (pre-create, post-finish) to the UI for authentication and processing.

Both services are installed automatically by `mithrandir ui` and managed via systemd (enable, start, stop, restart). When Caddy HTTPS is enabled, the Caddyfile is regenerated to reverse-proxy both services.

Builds use a **blue-green deployment** strategy: new builds are placed in an inactive slot under `ui/.deployments/`, then an atomic symlink swap points `current` to the new build. This allows zero-downtime updates.

**Self-update** from the web UI (or `mithrandir self-update`) logs each step to `/var/log/mithrandir-ui-update.log` with timestamps. The log covers git pull, dependency install, CLI build, UI build, deployment, and service restart — useful for diagnosing update failures.

**Running the UI:**
```bash
mithrandir ui               # Build, deploy, and start both services (production)
mithrandir ui stop          # Stop both services
bun run ui:dev              # Development server on port 3000 (hot reload)
bun run ui:build            # Build for production
bun run ui:preview          # Preview the production build
```

The UI requires a `.env.local` file in the `ui/` directory with `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` (a 32-character secret, generate with `openssl rand -base64 32`) for authentication. When started via `mithrandir ui`, this file is auto-generated if missing.

**OIDC SSO (optional):** To enable single sign-on via an external identity provider, add `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, and `OIDC_ISSUER_URL` to `ui/.env.local`. Supports any OIDC-compliant provider (Authentik, Keycloak, Authelia, etc.). Set the redirect URI in your IdP to `{BETTER_AUTH_URL}/api/auth/oauth2/callback/oidc`.

## Local Development

The project is a [Bun workspaces](https://bun.sh/docs/install/workspaces) monorepo. Each subproject (`cli/`, `docs/`, `ui/`) has its own `package.json` with workspace-scoped dependencies, while the root `package.json` provides global proxy scripts and a single `bun.lock`. Running `bun install` at the root installs everything.

```bash
git clone https://github.com/Joel-Mercier/mithrandir.git && cd mithrandir
bun install
```

**Creating a release:**
```bash
scripts/release.sh 1.1.0    # Bumps version, generates changelog, commits, and tags
git push && git push --tags  # Push the release
```

The release script bumps the version in `cli/package.json` and `docs/.vitepress/config.ts`, regenerates `docs/changelog.md` from git tags, creates a commit, and tags it. The changelog groups commits by tag, with unreleased commits shown at the top.

You can also regenerate the changelog manually at any time:
```bash
scripts/generate-changelog.sh
```

**Available scripts:**

| Command | Description |
|---------|-------------|
| `bun run cli:start` | Run the CLI in dev mode (unbundled) |
| `bun run cli:build` | Bundle into `cli/dist/mithrandir.js` |
| `bun run cli:test` | Run CLI unit and snapshot tests |
| `bun run cli:typecheck` | TypeScript type checking for CLI |
| `bun run ui:dev` | Local Vite dev server with hot reload |
| `bun run ui:build` | Build the UI for production |
| `bun run ui:preview` | Preview the built UI |
| `bun run ui:test` | Run UI unit and snapshot tests |
| `bun run ui:format` | Format all UI files |
| `bun run ui:lint` | Lint all UI files |
| `bun run ui:check` | Biome checking for UI |
| `bun run ui:typecheck` | TypeScript type checking for UI |
| `bun run build` | Build all workspaces |
| `bun run test` | Run tests across all workspaces |
| `bun run typecheck` | TypeScript type checking for all workspaces |
| `bun run docs:dev` | Local VitePress dev server with hot reload |
| `bun run docs:build` | Build the documentation site for production |
| `bun run docs:preview` | Preview the built documentation site |
| `bun run release <version>` | Create a new release |

## Testing

Tests use Bun's built-in test runner. Test files are in `cli/src/__tests__/`:

- **App registry** (`apps.test.ts`) — validates app lookups, container names, config paths, conflict filtering, stacks, and registry integrity
- **Config parsing** (`config.test.ts`) — tests `.env` loading (KEY=VALUE, quotes, `export` prefix, comments) and backup config defaults
- **Compose generation** (`compose.test.ts`) — snapshot tests for docker-compose.yml output across all app types (standard, host-networked, secrets, healthchecks, capabilities, multi-config, port remapping, rawCompose)
- **Caddy generation** (`caddy.test.ts`) — tests domain derivation, Caddyfile generation, 404 page, and Dockerfile output
- **Backup utilities** (`backup-utils.test.ts`) — archive suffix stripping, backup archive detection, and archive filename generation
- **Crypto** (`crypto.test.ts`) — encrypted backup file detection
- **Systemd** (`systemd.test.ts`) — service and timer unit generation with snapshot tests
- **Swap** (`swap.test.ts`) — swap size formatting (GB/MB thresholds, edge cases)
- **Logger** (`logger.test.ts`) — log message formatting, timestamp pattern validation, and log path constants

Snapshot files are stored in `cli/src/__tests__/__snapshots__/` and committed to git. When compose or caddy generation logic changes, update snapshots with:

```bash
bun test --update-snapshots
```

### Integration Tests

VM-based end-to-end tests live in `cli/integration-tests/` using [nix-vm-test](https://github.com/numtide/nix-vm-test). Debian 13 VMs are spun up via QEMU to test critical CLI paths: install flow, Docker setup, app lifecycle, backup/restore, diagnostics, and updates. Requires a Linux host with KVM (runs in CI on GitHub Actions with hardware-accelerated KVM).

See `cli/integration-tests/README.md` for details on running locally and writing new tests.

### CI

A GitHub Actions workflow runs on every push and pull request to `main`. It runs `bun run typecheck`, `bun run build`, and `bun run test` across all workspaces. A parallel matrix of integration tests spins up Debian VMs to verify the install flow, Docker setup, app lifecycle, backup/restore, diagnostics, and update commands.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automated Docker-based homelab setup, backup, and restore system for Debian/Ubuntu servers. React-for-terminals app using Bun and Ink.

## Commands

### Ink CLI
```bash
bun install                    # Install dependencies
bun run build                  # Bundle into dist/mithrandir.js
mithrandir setup                       # Interactive setup wizard
mithrandir backup                      # Backup all apps
mithrandir backup list [local|remote]     # List existing backups
mithrandir backup delete <local|remote> [date] [--yes]  # Delete backups
mithrandir backup verify [date] [--remote] [--extract]  # Verify backup integrity
mithrandir restore <app|full> [date] [--yes]
mithrandir recover [--yes]              # Full disaster recovery from remote backup
mithrandir start <app>                    # Start a stopped app
mithrandir stop <app>                     # Stop a running app
mithrandir restart <app>                  # Restart a running app
mithrandir install <app>                    # Install a single app
mithrandir install <stack>                  # Install a predefined app stack
mithrandir install docker                   # Install Docker engine
mithrandir install backup                   # Install rclone + backup systemd timer
mithrandir install https                    # Install Caddy HTTPS reverse proxy
mithrandir install firewall                 # Install UFW firewall with ufw-docker
mithrandir reinstall <app> [--yes]        # Reinstall an app from scratch
mithrandir uninstall <app>
mithrandir status                      # Check system status
mithrandir health                      # Check system health
mithrandir doctor                     # Diagnose setup issues
mithrandir update [app] [--yes]        # Update container images
mithrandir log <app> [--follow] [--tail N] [--since TIME]  # View container logs
mithrandir graph                           # Show inter-app dependency tree
mithrandir self-update                # Update CLI from git and rebuild
mithrandir version                         # Show version and git commit hash
mithrandir config                          # Show current .env settings
mithrandir completions <bash|zsh|fish>     # Generate shell completion script
mithrandir docs                    # Build and serve docs website
mithrandir docs stop               # Stop docs website
bun run docs:dev                        # Local VitePress dev server (hot reload)
bun run typecheck              # TypeScript type checking (tsc --noEmit)
bun run src/index.tsx --help         # Dev mode (unbundled)
```

## Architecture

### App Registry Pattern (`src/lib/apps.ts`)
Single source of truth for all services. Each `AppDefinition` encodes everything needed across all commands: Docker image, ports, config paths, volume mounts, secrets, capabilities. This replaces the duplicated `get_app_config()` case statements in backup.sh/restore.sh and per-app compose blocks in setup.sh. **Any new service must be added here.** Multi-container apps with `rawCompose` generators: Immich (postgres/redis/ML), Sure (postgres/redis/worker), AFFiNE (postgres/redis/migration). Also defines `APP_STACKS` — installable groups of interdependent apps (media, media-movies-tv, media-music, media-pictures, security) used by `install <stack>`, and `APP_CATEGORIES` — broader groupings (media, automation, monitoring, productivity, finance, security, utilities) used by the setup wizard's category picker.

### Compose Generation (`src/lib/compose.ts`)
Generates docker-compose.yml deterministically from an `AppDefinition` + `EnvConfig`. Handles special cases: host networking (Home Assistant, DuckDNS), multiple config dirs (Homarr), non-standard container paths (Seerr → `/app/config`), capabilities/sysctls (WireGuard), healthchecks (Seerr).

Secret env var names are mapped between .env and compose: `DUCKDNS_SUBDOMAINS` → `SUBDOMAINS`, `DUCKDNS_TOKEN` → `TOKEN`, `WG_SERVERURL` → `SERVERURL`, `WG_PEERS` → `PEERS`.

When `ENABLE_HTTPS=true`, compose generation filters port 443 from Pi-hole's extra ports (Caddy owns 443).

### HTTPS / Caddy (`src/lib/caddy.ts`)
`mithrandir install https` sets up Caddy as a wildcard HTTPS reverse proxy using DuckDNS DNS-01 challenge. Caddy is a hidden app in the registry (not shown in setup app-select) with a `rawCompose` generator. Domain is derived from `DUCKDNS_SUBDOMAINS` via `getDuckDnsDomain()` — no separate `PRIMARY_DOMAIN` env var. `generateCaddyfile()` creates reverse proxy blocks for all installed apps with ports. `regenerateCaddyfile()` is called after app install/uninstall to keep the Caddyfile in sync. The Caddy Docker image is built locally with `xcaddy` + `caddy-dns/duckdns` module. Requires DuckDNS app to be installed and running. Users must configure wildcard DNS on their router (`*.domain.duckdns.org → LAN IP`).

### Firewall (`src/lib/ufw.ts`)
`mithrandir install firewall` sets up UFW with the `ufw-docker` third-party utility. Standard UFW doesn't work with Docker (Docker bypasses iptables), so `ufw-docker` manages rules in the `DOCKER-USER` chain. For host-networked apps (Home Assistant, DuckDNS), regular `ufw allow` rules are used. For bridge-networked apps, `ufw-docker allow <container> <port>` is used. When `ENABLE_FIREWALL=true`, install/uninstall commands automatically add/remove UFW rules. SSH (port 22) is always allowed.

### Documentation Site (`docs/`)
VitePress static site in `docs/` folder, served via Docker (nginx). `mithrandir docs` builds the Docker image and starts the container on port 4173. `mithrandir docs stop` stops it. When Caddy HTTPS is enabled, `regenerateCaddyfile()` automatically adds/removes a `mithrandir-docs` reverse proxy entry. The docs container is not part of the app registry — it's managed separately.

### TTY / Non-TTY Branching (Backup)
The backup command runs from systemd timer (non-TTY) daily. `commands/backup.tsx` checks `process.stdout.isTTY` — TTY renders Ink components with spinners and progress, non-TTY writes timestamped plaintext to stdout + `/var/log/homelab-backup.log`. Both paths call the same `lib/` functions. When `BACKUP_PASSWORD` is set, backups are encrypted with AES-256-CBC via `openssl` after creation — the password is read from `.env` so automated backups work without interaction.

### Config Loading (`src/lib/config.ts`)
`getProjectRoot()` resolves the repo root by walking up from `src/lib/`. `.env` lives at repo root. `loadEnvConfig()` loads all settings (including backup config) from `.env`. `getBackupConfig(env)` extracts and parses backup-related fields from an `EnvConfig` into a typed `BackupConfig` with number retention values.

### Auto Update Check (`src/lib/update-check.ts`)
On every CLI invocation (except `self-update`, `version`, `completions`), an update check runs concurrently with the command. It compares local `HEAD` with `origin/<branch>` via `git fetch --quiet`, caching the last check timestamp in `~/.cache/mithrandir/last-update-check` (24-hour interval). If behind, a yellow notice is printed after command output. The check is wrapped in try/catch so it never breaks the CLI.

### API Wrappers
There are API wrappers for the following services in `src/lib`:
- Jellyfin
- Prowlarr
- Radarr
- Sonarr
- Lidarr
- Seerr
- qBittorrent

These allow programmatic access to the APIs of the above services.

## Configuration

- **.env** — All configuration lives here. Core settings: `BASE_DIR`, `PUID`/`PGID`, `TZ`. Per-app secrets: DuckDNS, WireGuard, Spotify. Backup settings: `BACKUP_DIR` (default `/backups`), `LOCAL_RETENTION` (5), `REMOTE_RETENTION` (10), `RCLONE_REMOTE` (gdrive), `APPS` (auto or comma-separated), `BACKUP_PASSWORD` (optional, encrypts backups with AES-256-CBC). HTTPS settings: `ENABLE_HTTPS`, `ACME_EMAIL`. Firewall: `ENABLE_FIREWALL`. Not in git.
- **.env.example** — Template with all available env vars and defaults. **When adding new env vars (e.g. app secrets), always add them to `.env.example` too.**

### Changelog (`docs/changelog.md`)
Auto-generated from git commits via `scripts/generate-changelog.sh`, grouped by git tags. Each tag becomes a version section; commits after the latest tag appear under "Unreleased". The script categorizes commits by message prefix (add/fix/update/etc.). To create a release, run `scripts/release.sh <version>` — this bumps the version in `package.json` and the nav dropdown in `docs/.vitepress/config.ts`, generates the changelog, commits everything, and creates the git tag.

## Key Constraints

- `@inkjs/ui` ConfirmInput uses separate `onConfirm`/`onCancel` callbacks (both `() => void`), not a single callback with a boolean parameter
- `execa` v9: `result.exitCode` can be `undefined`, needs `?? 0` fallback
- Docker operations auto-detect: if user is in docker group, sudo is skipped; otherwise sudo is used transparently via `dockerNeedsSudo()` in `shell.ts`
- Homarr is the only app with `configSubdir: "multiple"` (3 dirs: configs, icons, data)
- Caddy is a hidden app (`hidden: true`) — excluded from setup app-select but included in backup/restore/status
- Vaultwarden has `requiresHttps: true` — install command checks `ENABLE_HTTPS` before proceeding; setup wizard skips it with a warning if HTTPS isn't enabled. Its `DOMAIN` env var is derived from `DUCKDNS_SUBDOMAINS` in compose generation.
- `composeUp`/`composeDown` expect a compose **file path** (not directory) — they derive `cwd` via `dirname()`
- Systemd unit uses `/usr/local/bin/mithrandir` directly; only needs `PATH` set (no `BUN_INSTALL`)

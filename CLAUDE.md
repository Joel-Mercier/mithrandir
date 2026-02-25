# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automated Docker-based homelab setup, backup, and restore system for Debian/Ubuntu servers. React-for-terminals app using Bun and Ink.

## Commands

### Ink CLI
```bash
bun install                    # Install dependencies
bun run build                  # Bundle into dist/mithrandir.js
sudo mithrandir setup                       # Interactive setup wizard
sudo mithrandir backup                      # Backup all apps
sudo mithrandir backup list [local|remote]     # List existing backups
sudo mithrandir backup delete <local|remote> [date] [--yes]  # Delete backups
sudo mithrandir backup verify [date] [--remote] [--extract]  # Verify backup integrity
sudo mithrandir restore <app|full> [date] [--yes]
sudo mithrandir recover [--yes]              # Full disaster recovery from remote backup
sudo mithrandir start <app>                    # Start a stopped app
sudo mithrandir stop <app>                     # Stop a running app
sudo mithrandir restart <app>                  # Restart a running app
sudo mithrandir install <app>                    # Install a single app
sudo mithrandir install docker                   # Install Docker engine
sudo mithrandir install backup                   # Install rclone + backup systemd timer
sudo mithrandir install https                    # Install Caddy HTTPS reverse proxy
sudo mithrandir reinstall <app> [--yes]        # Reinstall an app from scratch
sudo mithrandir uninstall <app>
sudo mithrandir status                      # Check system status
sudo mithrandir health                      # Check system health
sudo mithrandir doctor                     # Diagnose setup issues
sudo mithrandir update [app] [--yes]        # Update container images
sudo mithrandir log <app> [--follow] [--tail N] [--since TIME]  # View container logs
sudo mithrandir self-update                # Update CLI from git and rebuild
mithrandir version                         # Show version and git commit hash
mithrandir config                          # Show current .env settings
mithrandir completions <bash|zsh|fish>     # Generate shell completion script
bun run typecheck              # TypeScript type checking (tsc --noEmit)
bun run src/index.tsx --help         # Dev mode (unbundled)
```

## Architecture

### App Registry Pattern (`src/lib/apps.ts`)
Single source of truth for all services. Each `AppDefinition` encodes everything needed across all commands: Docker image, ports, config paths, volume mounts, secrets, capabilities. This replaces the duplicated `get_app_config()` case statements in backup.sh/restore.sh and per-app compose blocks in setup.sh. **Any new service must be added here.**

### Compose Generation (`src/lib/compose.ts`)
Generates docker-compose.yml deterministically from an `AppDefinition` + `EnvConfig`. Handles special cases: host networking (Home Assistant, DuckDNS), multiple config dirs (Homarr), non-standard container paths (Seerr → `/app/config`, Uptime Kuma → `/app/data`), capabilities/sysctls (WireGuard), healthchecks (Seerr).

Secret env var names are mapped between .env and compose: `DUCKDNS_SUBDOMAINS` → `SUBDOMAINS`, `DUCKDNS_TOKEN` → `TOKEN`, `WG_SERVERURL` → `SERVERURL`, `WG_PEERS` → `PEERS`.

When `ENABLE_HTTPS=true`, compose generation filters port 443 from Pi-hole's extra ports (Caddy owns 443).

### HTTPS / Caddy (`src/lib/caddy.ts`)
`mithrandir install https` sets up Caddy as a wildcard HTTPS reverse proxy using DuckDNS DNS-01 challenge. Caddy is a hidden app in the registry (not shown in setup app-select) with a `rawCompose` generator. Domain is derived from `DUCKDNS_SUBDOMAINS` via `getDuckDnsDomain()` — no separate `PRIMARY_DOMAIN` env var. `generateCaddyfile()` creates reverse proxy blocks for all installed apps with ports. `regenerateCaddyfile()` is called after app install/uninstall to keep the Caddyfile in sync. The Caddy Docker image is built locally with `xcaddy` + `caddy-dns/duckdns` module. Requires DuckDNS app to be installed and running. Users must configure wildcard DNS on their router (`*.domain.duckdns.org → LAN IP`).

### TTY / Non-TTY Branching (Backup)
The backup command runs from systemd timer (non-TTY) daily. `commands/backup.tsx` checks `process.stdout.isTTY` — TTY renders Ink components with spinners and progress, non-TTY writes timestamped plaintext to stdout + `/var/log/homelab-backup.log`. Both paths call the same `lib/` functions.

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

- **.env** — All configuration lives here. Core settings: `BASE_DIR`, `PUID`/`PGID`, `TZ`. Per-app secrets: DuckDNS, WireGuard, Spotify. Backup settings: `BACKUP_DIR` (default `/backups`), `LOCAL_RETENTION` (5), `REMOTE_RETENTION` (10), `RCLONE_REMOTE` (gdrive), `APPS` (auto or comma-separated). HTTPS settings: `ENABLE_HTTPS`, `ACME_EMAIL`. Not in git.

## Key Constraints

- `@inkjs/ui` ConfirmInput uses separate `onConfirm`/`onCancel` callbacks (both `() => void`), not a single callback with a boolean parameter
- `execa` v9: `result.exitCode` can be `undefined`, needs `?? 0` fallback
- Docker operations require sudo/root
- Homarr is the only app with `configSubdir: "multiple"` (3 dirs: configs, icons, data)
- Caddy is a hidden app (`hidden: true`) — excluded from setup app-select but included in backup/restore/status
- `composeUp`/`composeDown` expect a compose **file path** (not directory) — they derive `cwd` via `dirname()`
- Systemd unit uses `/usr/local/bin/mithrandir` directly; only needs `PATH` set (no `BUN_INSTALL`)

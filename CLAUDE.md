# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automated Docker-based homelab setup, backup, and restore system for Debian/Ubuntu servers. Two interfaces exist side-by-side: the original bash scripts (~2,200 lines across 3 files) and a new Ink CLI (`cli/`) that reimplements them as a React-for-terminals app using Bun.

## Commands

### Ink CLI (cli/)
```bash
cd cli && bun install                    # Install dependencies
cd cli && bun run build                  # Bundle into dist/mithrandir.js
sudo mithrandir setup                       # Interactive setup wizard
sudo mithrandir backup                      # Backup all apps
sudo mithrandir backup list [local|remote]     # List existing backups
sudo mithrandir backup delete <local|remote> [date] [--yes]  # Delete backups
sudo mithrandir backup verify [date] [--remote] [--extract]  # Verify backup integrity
sudo mithrandir restore <app|full> [date] [--yes]
sudo mithrandir start <app>                    # Start a stopped app
sudo mithrandir stop <app>                     # Stop a running app
sudo mithrandir restart <app>                  # Restart a running app
sudo mithrandir install <app>                    # Install a single app
sudo mithrandir install docker                   # Install Docker engine
sudo mithrandir install backup                   # Install rclone + backup systemd timer
sudo mithrandir reinstall <app> [--yes]        # Reinstall an app from scratch
sudo mithrandir uninstall <app>
sudo mithrandir status                      # Check system status
sudo mithrandir health                      # Check system health
sudo mithrandir update [app] [--yes]        # Update container images
sudo mithrandir log <app> [--follow] [--tail N] [--since TIME]  # View container logs
sudo mithrandir self-update                # Update CLI from git and rebuild
mithrandir version                         # Show version and git commit hash
mithrandir config                          # Show current .env and backup.conf settings
mithrandir completions <bash|zsh|fish>     # Generate shell completion script
cd cli && bun run typecheck              # TypeScript type checking (tsc --noEmit)
bun run cli/src/index.tsx --help         # Dev mode (unbundled)
```

### Bash Scripts (legacy fallback)
```bash
bash setup.sh [--yes] [--uninstall <app>]
bash backup.sh
bash backup.sh delete <local|remote> [YYYY-MM-DD]
bash restore.sh <app|full> [YYYY-MM-DD|latest] [--yes]
```

No test suite exists. Validate changes by reading script logic and type-checking.

## Architecture

### Dual-Interface Design
The bash scripts remain as the stable fallback. The Ink CLI (`cli/`) is the migration target. Both operate on the same `.env`, `backup.conf`, and `BASE_DIR` directory structure. The CLI generates identical docker-compose.yml files and zstd tarballs.

### App Registry Pattern (`cli/src/lib/apps.ts`)
Single source of truth for all 14 services. Each `AppDefinition` encodes everything needed across all commands: Docker image, ports, config paths, volume mounts, secrets, capabilities. This replaces the duplicated `get_app_config()` case statements in backup.sh/restore.sh and per-app compose blocks in setup.sh. **Any new service must be added here.**

### Compose Generation (`cli/src/lib/compose.ts`)
Generates docker-compose.yml deterministically from an `AppDefinition` + `EnvConfig`. Handles special cases: host networking (Home Assistant, DuckDNS), multiple config dirs (Homarr), non-standard container paths (Seerr → `/app/config`, Uptime Kuma → `/app/data`), capabilities/sysctls (WireGuard), healthchecks (Seerr).

Secret env var names are mapped between .env and compose: `DUCKDNS_SUBDOMAINS` → `SUBDOMAINS`, `DUCKDNS_TOKEN` → `TOKEN`, `WG_SERVERURL` → `SERVERURL`, `WG_PEERS` → `PEERS`.

### TTY / Non-TTY Branching (Backup)
The backup command runs from systemd timer (non-TTY) daily. `commands/backup.tsx` checks `process.stdout.isTTY` — TTY renders Ink components with spinners and progress, non-TTY writes timestamped plaintext to stdout + `/var/log/homelab-backup.log`. Both paths call the same `lib/` functions.

### Config Loading (`cli/src/lib/config.ts`)
`getProjectRoot()` resolves the repo root by walking up from `cli/src/lib/`. `.env` and `backup.conf` live at repo root, not inside `cli/`.

### Auto Update Check (`cli/src/lib/update-check.ts`)
On every CLI invocation (except `self-update`, `version`, `completions`), an update check runs concurrently with the command. It compares local `HEAD` with `origin/<branch>` via `git fetch --quiet`, caching the last check timestamp in `~/.cache/mithrandir/last-update-check` (24-hour interval). If behind, a yellow notice is printed after command output. The check is wrapped in try/catch so it never breaks the CLI.

### API Wrappers
There are API wrappers for the following services in `cli/src/lib`:
- Jellyfin
- Prowlarr
- Radarr
- Sonarr
- Lidarr
- Seerr
- qBittorrent

These allow programmatic access to the APIs of the above services.

## Configuration

- **.env** — `BASE_DIR`, `PUID`/`PGID`, `TZ`, plus per-app secrets (DuckDNS, WireGuard, Spotify). Not in git.
- **backup.conf** — `BACKUP_DIR` (default `/backups`), `LOCAL_RETENTION` (5), `REMOTE_RETENTION` (10), `RCLONE_REMOTE` (gdrive), `APPS` (auto or comma-separated).

## Key Constraints

- `@inkjs/ui` ConfirmInput uses separate `onConfirm`/`onCancel` callbacks (both `() => void`), not a single callback with a boolean parameter
- `execa` v9: `result.exitCode` can be `undefined`, needs `?? 0` fallback
- Bash scripts require bash 4+, use `set -Eeuo pipefail`, and set `IFS=$'\n\t'`
- Docker operations require sudo/root
- Homarr is the only app with `configSubdir: "multiple"` (3 dirs: configs, icons, data)
- Systemd unit uses `/usr/local/bin/mithrandir` directly; only needs `PATH` set (no `BUN_INSTALL`)

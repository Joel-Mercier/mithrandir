# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automated Docker-based homelab setup, backup, and restore system for Debian/Ubuntu servers. Two interfaces exist side-by-side: the original bash scripts (~2,200 lines across 3 files) and a new Ink CLI (`cli/`) that reimplements them as a React-for-terminals app using Bun.

## Commands

### Ink CLI (cli/)
```bash
bun install                              # Install dependencies (run from cli/)
bun run cli/src/index.tsx --help         # Show usage
bun run cli/src/index.tsx setup          # Interactive setup wizard
bun run cli/src/index.tsx backup         # Backup all apps
bun run cli/src/index.tsx restore <app|full> [date] [--yes]
bun run cli/src/index.tsx uninstall <app>
cd cli && bun run typecheck              # TypeScript type checking (tsc --noEmit)
```

### Bash Scripts (legacy fallback)
```bash
bash setup.sh [--yes] [--uninstall <app>]
bash backup.sh
bash restore.sh <app|full> [YYYY-MM-DD|latest] [--yes]
```

No test suite exists. Validate changes by reading script logic and type-checking.

## Architecture

### Dual-Interface Design
The bash scripts remain as the stable fallback. The Ink CLI (`cli/`) is the migration target. Both operate on the same `.env`, `backup.conf`, and `BASE_DIR` directory structure. The CLI generates identical docker-compose.yml files and zstd tarballs.

### App Registry Pattern (`cli/src/lib/apps.ts`)
Single source of truth for all 14 services. Each `AppDefinition` encodes everything needed across all commands: Docker image, ports, config paths, volume mounts, secrets, capabilities. This replaces the duplicated `get_app_config()` case statements in backup.sh/restore.sh and per-app compose blocks in setup.sh. **Any new service must be added here.**

### Compose Generation (`cli/src/lib/compose.ts`)
Generates docker-compose.yml deterministically from an `AppDefinition` + `EnvConfig`. Handles special cases: host networking (Home Assistant, DuckDNS), multiple config dirs (Homarr), non-standard container paths (Jellyseerr → `/app/config`, Uptime Kuma → `/app/data`), capabilities/sysctls (WireGuard), healthchecks (Jellyseerr).

Secret env var names are mapped between .env and compose: `DUCKDNS_SUBDOMAINS` → `SUBDOMAINS`, `DUCKDNS_TOKEN` → `TOKEN`, `WG_SERVERURL` → `SERVERURL`, `WG_PEERS` → `PEERS`.

### TTY / Non-TTY Branching (Backup)
The backup command runs from systemd timer (non-TTY) daily. `commands/backup.tsx` checks `process.stdout.isTTY` — TTY renders Ink components with spinners and progress, non-TTY writes timestamped plaintext to stdout + `/var/log/homelab-backup.log`. Both paths call the same `lib/` functions.

### Config Loading (`cli/src/lib/config.ts`)
`getProjectRoot()` resolves the repo root by walking up from `cli/src/lib/`. `.env` and `backup.conf` live at repo root, not inside `cli/`.

## Configuration

- **.env** — `BASE_DIR`, `PUID`/`PGID`, `TZ`, plus per-app secrets (DuckDNS, WireGuard, Spotify). Not in git.
- **backup.conf** — `BACKUP_DIR` (default `/backups`), `LOCAL_RETENTION` (5), `REMOTE_RETENTION` (10), `RCLONE_REMOTE` (gdrive), `APPS` (auto or comma-separated).

## Key Constraints

- `@inkjs/ui` ConfirmInput uses separate `onConfirm`/`onCancel` callbacks (both `() => void`), not a single callback with a boolean parameter
- `execa` v9: `result.exitCode` can be `undefined`, needs `?? 0` fallback
- Bash scripts require bash 4+, use `set -Eeuo pipefail`, and set `IFS=$'\n\t'`
- Docker operations require sudo/root
- Homarr is the only app with `configSubdir: "multiple"` (3 dirs: configs, icons, data)
- Systemd unit for CLI must set explicit `PATH` and `BUN_INSTALL` since systemd doesn't source `.bashrc`

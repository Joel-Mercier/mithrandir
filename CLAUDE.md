# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automated Docker-based homelab setup, backup, and restore system for Debian/Ubuntu servers. Bun workspaces monorepo with three subprojects: CLI (Bun/Ink), Docs (VitePress), and UI (Vite/React/TanStack Start).
To get any information about the Bun runtime, package manager, bundler or test runner, please refer to the [Bun documentation](https://bun.com/docs/llms.txt).

## Monorepo Structure

```
homelab/
  package.json            # workspace root (private, no deps)
  tsconfig.base.json      # shared TS compiler options
  bun.lock                # single lockfile
  .env / .env.example     # config at root
  install.sh              # bootstrap script
  scripts/                # release, changelog scripts
  cli/                    # @mithrandir/cli workspace
    package.json          # CLI deps, bin, scripts
    tsconfig.json         # extends ../tsconfig.base.json
    build.ts              # Bun bundler config
    src/                  # CLI source code
    dist/                 # build output (cli/dist/mithrandir.js)
    integration-tests/    # Nix VM-based e2e tests
  docs/                   # @mithrandir/docs workspace
    package.json          # VitePress dep
    .vitepress/
    Dockerfile            # workspace-aware multi-stage build
    docker-compose.yml
    guide/ reference/ fr/
  ui/                     # @mithrandir/ui workspace
    package.json          # TanStack Start + React deps
    tsconfig.json
    vite.config.ts        # Vite + TanStack Router plugin
    biome.json            # Biome linter/formatter config
    src/                  # UI source code
    public/               # static assets
```

Root `package.json` has proxy scripts that delegate to workspaces via `bun run --filter`. All commands (`bun run build`, `bun run test`, etc.) work from the repo root.

### Cross-workspace Imports

The CLI's `cli/package.json` has an `exports` field enabling other workspaces to import lib modules:
```typescript
import { getInstalledApps } from "@mithrandir/cli/lib/apps"
import { shell } from "@mithrandir/cli/lib/shell"
```

## Commands

### Ink CLI
```bash
bun install                    # Install dependencies (all workspaces)
bun run cli:build              # Bundle into cli/dist/mithrandir.js
bun run build                  # Build all workspaces
mithrandir setup                       # Interactive setup wizard
mithrandir backup                      # Backup all apps
mithrandir backup list [local|remote]     # List existing backups
mithrandir backup delete <local|remote> [date] [--yes]  # Delete backups
mithrandir backup config                                 # View and edit backup settings
mithrandir backup verify [date] [--remote] [--extract]  # Verify backup integrity
mithrandir backup remote add                           # Add a new rclone remote
mithrandir backup remote list                          # Show configured remotes
mithrandir backup remote remove <name>                 # Remove a backup remote
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
mithrandir capacity                    # Show system capacity and resource scores
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
bun run ui:dev                          # TanStack Start dev server (port 3000)
bun run ui:build                        # Build UI for production
bun run ui:test                         # Run UI tests (Vitest)
bun run ui:lint                         # Lint UI with Biome
bun run ui:format                       # Format UI with Biome
bun run ui:check                        # Biome check (lint + format)
bun run ui:typecheck                    # TypeScript type checking for UI
bun run cli:test               # Run CLI unit and snapshot tests
bun run test                   # Run tests across all workspaces
bun run cli:typecheck          # TypeScript type checking for CLI
bun run typecheck              # TypeScript type checking for all workspaces
bun run cli:start -- --help    # Dev mode (unbundled)
```

## UI Workspace (`ui/`)

TanStack Start app with SSR, file-based routing, and Vite. Created via `create-tanstack-app` with add-ons: Biome, Form, shadcn, Better-Auth, TanStack Query.

### Stack

- **Framework**: TanStack Start (SSR) + React 19 + Vite 7
- **Routing**: TanStack Router (file-based, auto-generates `src/routeTree.gen.ts`)
- **Styling**: Tailwind CSS v4 (CSS-based config in `src/styles.css`, no `tailwind.config.js`) + shadcn/ui (New York style, zinc base, lucide icons)
- **Data fetching**: TanStack Query (singleton `QueryClient` in `src/lib/tanstack-query/root-provider.tsx`, injected into router context)
- **Forms**: TanStack Form (`createFormHook()` in `src/hooks/`) with Zod validation
- **Auth**: Better-Auth with email/password, TanStack Start cookies plugin. Server config in `src/lib/auth.ts`, client in `src/lib/auth-client.ts`. API handler at `src/routes/api/auth/$.ts` (catch-all). Env vars: `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` in `ui/.env.local`.
- **Linting/formatting**: Biome (tab indentation). Config in `biome.json`.
- **Testing**: Vitest + Testing Library

### Key Patterns

- **Path aliases**: `#/*` and `@/*` both map to `./src/*` (tsconfig paths)
- **Route files**: `src/routes/` directory. `__root.tsx` defines the root layout with `createRootRouteWithContext<{ queryClient: QueryClient }>()`. Pages use `createFileRoute()`.
- **Server handlers**: API routes use TanStack Start server handlers pattern: `createFileRoute().server.handlers.{GET,POST}`
- **shadcn components**: `src/components/ui/` — added via `npx shadcn@latest add <component>`. Config in `components.json`.
- **Form components**: Custom field components (`TextField`, `Select`, `TextArea`, `Slider`, `Switch`) in `src/components/` wrap shadcn inputs with TanStack Form context and error display. `useAppForm` hook in `src/hooks/` bundles field + form components.
- **Theme**: Light/dark/auto via CSS class on `<html>`, persisted to localStorage. Toggle in `src/components/ThemeToggle.tsx`.
- **Root layout** (`src/routes/__root.tsx`): Wraps children with `TanStackQueryProvider`, includes devtools (Router + Query).

## Architecture

### App Registry Pattern (`cli/src/lib/apps.ts`)
Single source of truth for all services. Each `AppDefinition` encodes everything needed across all commands: Docker image, ports, config paths, volume mounts, secrets, capabilities. This replaces the duplicated `get_app_config()` case statements in backup.sh/restore.sh and per-app compose blocks in setup.sh. **Any new service must be added here.** Multi-container apps with `rawCompose` generators: Immich (postgres/redis/ML), Sure (postgres/redis/worker), AFFiNE (postgres/redis/migration), Penpot (postgres/valkey/backend/exporter/mailcatch), AdventureLog (postgis/backend/frontend), Your Spotify (mongo/server/web client), Paperless-ngx (redis/webserver). Also defines `APP_STACKS` — installable groups of interdependent apps (media, media-movies-tv, media-audio, media-pictures, media-games, security) used by `install <stack>`, and `APP_CATEGORIES` — broader groupings (media, automation, monitoring, productivity, finance, travel, security, statistics, household, games, utilities) used by the setup wizard's category picker.

### Compose Generation (`cli/src/lib/compose.ts`)
Generates docker-compose.yml deterministically from an `AppDefinition` + `EnvConfig`. Handles special cases: host networking (Home Assistant, DuckDNS), multiple config dirs (Homarr), non-standard container paths (Seerr → `/app/config`, Stirling PDF → `/configs`), capabilities/sysctls (WireGuard), healthchecks (Seerr).

Secret env var names are mapped between .env and compose: `DUCKDNS_SUBDOMAINS` → `SUBDOMAINS`, `DUCKDNS_TOKEN` → `TOKEN`, `WG_SERVERURL` → `SERVERURL`, `WG_PEERS` → `PEERS`.

When `ENABLE_HTTPS=true`, compose generation filters port 443 from Pi-hole's extra ports (Caddy owns 443).

### HTTPS / Caddy (`cli/src/lib/caddy.ts`)
`mithrandir install https` sets up Caddy as a wildcard HTTPS reverse proxy using DuckDNS DNS-01 challenge. Caddy is a hidden app in the registry (not shown in setup app-select) with a `rawCompose` generator. Domain is derived from `DUCKDNS_SUBDOMAINS` via `getDuckDnsDomain()` — no separate `PRIMARY_DOMAIN` env var. `generateCaddyfile()` creates reverse proxy blocks for all installed apps with ports. `regenerateCaddyfile()` is called after app install/uninstall to keep the Caddyfile in sync. The Caddy Docker image is built locally with `xcaddy` + `caddy-dns/duckdns` module. Requires DuckDNS app to be installed and running. Users must configure wildcard DNS on their router (`*.domain.duckdns.org → LAN IP`).

### Firewall (`cli/src/lib/ufw.ts`)
`mithrandir install firewall` sets up UFW with the `ufw-docker` third-party utility. Standard UFW doesn't work with Docker (Docker bypasses iptables), so `ufw-docker` manages rules in the `DOCKER-USER` chain. For host-networked apps (Home Assistant, DuckDNS), regular `ufw allow` rules are used. For bridge-networked apps, `ufw-docker allow <container> <port>` is used. When `ENABLE_FIREWALL=true`, install/uninstall commands automatically add/remove UFW rules. SSH (port 22) is always allowed.

### Documentation Site (`docs/`)
VitePress static site in `docs/` folder (its own workspace `@mithrandir/docs`), served via Docker (Caddy). `mithrandir docs` builds the Docker image and starts the container on port 4173. `mithrandir docs stop` stops it. When Caddy HTTPS is enabled, `regenerateCaddyfile()` automatically adds/removes a `mithrandir-docs` reverse proxy entry. The docs container is not part of the app registry — it's managed separately. **When modifying any docs content, always apply the same changes to all translation directories (e.g. `docs/fr/`).** The translated docs mirror the English structure — every file under `docs/guide/` and `docs/reference/` has a counterpart under `docs/fr/`.

### TTY / Non-TTY Branching (Backup)
The backup command runs from systemd timer (non-TTY) daily. `commands/backup.tsx` checks `process.stdout.isTTY` — TTY renders Ink components with spinners and progress, non-TTY writes timestamped plaintext to stdout + `/var/log/homelab-backup.log`. Both paths call the same `lib/` functions. When `BACKUP_PASSWORD` is set, backups are encrypted with AES-256-CBC via `openssl` after creation — the password is read from `.env` so automated backups work without interaction.

### Config Loading (`cli/src/lib/config.ts`)
`getProjectRoot()` resolves the repo root by walking up from `cli/src/lib/` and looking for a `package.json` with a `"workspaces"` field. Falls back to the first `package.json` found for non-workspace setups. `.env` lives at repo root. `loadEnvConfig()` loads all settings (including backup config) from `.env`. `getBackupConfig(env)` extracts and parses backup-related fields from an `EnvConfig` into a typed `BackupConfig` with number retention values.

### Auto Update Check (`cli/src/lib/update-check.ts`)
On every CLI invocation (except `self-update`, `version`, `completions`), an update check runs concurrently with the command. It compares local `HEAD` with `origin/<branch>` via `git fetch --quiet`, caching the last check timestamp in `~/.cache/mithrandir/last-update-check` (24-hour interval). If behind, a yellow notice is printed after command output. The check is wrapped in try/catch so it never breaks the CLI.

### Capacity Planning (`cli/src/lib/capacity.ts`)
Each `AppDefinition` has an optional `capacity` field with `performance` and `storage` scores ("low"/"medium"/"high") plus an optional `note`. `mithrandir capacity` gathers system specs (CPU, RAM, disk via platform-specific commands), detects installed apps, aggregates scores, and renders terminal graphs with verdicts. Verdicts compare aggregate scores against hardware: performance (Comfortable/Adequate/Tight/Overloaded) and storage (Healthy/Moderate/Warning/Critical based on disk usage percentage).

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

- **.env** — All configuration lives here. Core settings: `BASE_DIR`, `PUID`/`PGID`, `TZ`. Per-app secrets: DuckDNS, WireGuard, Spotify. Backup settings: `BACKUP_DIR` (default `/backups`), `LOCAL_RETENTION` (5), `REMOTE_RETENTION` (10), `RCLONE_REMOTES` (comma-separated rclone remotes, default `gdrive`; legacy `RCLONE_REMOTE` also supported), `APPS` (auto or comma-separated), `BACKUP_HOUR` (0-23, default 2 — hour when systemd timer runs), `BACKUP_PASSWORD` (optional, encrypts backups with AES-256-CBC). HTTPS settings: `ENABLE_HTTPS`, `ACME_EMAIL`. Firewall: `ENABLE_FIREWALL`. Not in git.
- **.env.example** — Template with all available env vars and defaults. **When adding new env vars (e.g. app secrets), always add them to `.env.example` too.**

### Changelog (`docs/changelog.md`)
Auto-generated from git commits via `scripts/generate-changelog.sh`, grouped by git tags. Each tag becomes a version section; commits after the latest tag appear under "Unreleased". The script categorizes commits by message prefix (add/fix/update/etc.). To create a release, run `scripts/release.sh <version>` — this bumps the version in `cli/package.json` and the nav dropdown in `docs/.vitepress/config.ts`, generates the changelog, commits everything, and creates the git tag.

## Testing

### CLI Tests

Tests use Bun's built-in test runner. All test files live in `cli/src/__tests__/`.

- **`apps.test.ts`** — App registry unit tests: `getApp()`, `getContainerName()`, `getConfigPaths()`, `filterConflicts()`, stacks, and registry integrity validation
- **`config.test.ts`** — Config parsing: `getBackupConfig()` retention/defaults, `loadEnvConfig()` with temp `.env` files (KEY=VALUE, quotes, `export` prefix, comments)
- **`compose.test.ts`** — Compose generation snapshot tests: standard apps, host networking, secrets, healthchecks, capabilities/sysctls, multi-config dirs, Pi-hole port remapping, rawCompose apps
- **`caddy.test.ts`** — Caddy generation: `getDuckDnsDomain()`, Caddyfile snapshots, 404 page, Dockerfile
- **`backup-utils.test.ts`** — Archive suffix stripping, backup archive detection, archive filename generation
- **`crypto.test.ts`** — Encrypted backup file detection via `isEncryptedBackup()`
- **`systemd.test.ts`** — Service and timer unit generation snapshots and content validation
- **`swap.test.ts`** — `formatSwapSize()` GB/MB formatting and threshold edge cases
- **`logger.test.ts`** — `Logger.format()` timestamp pattern, log path constants

Snapshots are stored in `cli/src/__tests__/__snapshots__/` and committed to git. Update with `bun test --update-snapshots` when compose/caddy generation logic changes.

### UI Tests

Tests use Vitest with a dedicated config (`ui/vitest.config.ts`). Test files live in `ui/src/__tests__/`.

- **`utils.test.ts`** — `formatUptime()` uptime string formatting (days/hours/minutes), `parseMemoryMB()` memory string parsing (GiB/MiB/KiB/GB/MB/KB)
- **`server-utils.test.ts`** — `getProjectRoot()` monorepo root resolution from the UI workspace

### Integration Tests (`cli/integration-tests/`)

VM-based end-to-end tests using [nix-vm-test](https://github.com/numtide/nix-vm-test). A Nix flake in `cli/integration-tests/flake.nix` defines tests that spin up Debian 13 QEMU VMs. Uses the NixOS test driver Python API (`vm.succeed()`, `vm.wait_for_unit()`, etc.). Requires Linux with KVM — cannot run on macOS directly.

Tests (all use Prowlarr as the test app):
- **`getting-started`** — Clone → `install.sh` → `mithrandir --help`
- **`docker-install`** — `mithrandir install docker` + idempotency
- **`app-lifecycle`** — Install/status/stop/start/restart/uninstall
- **`backup-restore`** — Backup, verify, verify --extract, restore
- **`diagnostics`** — version, config, health, doctor, capacity, status
- **`update`** — `mithrandir update prowlarr --yes` + backup verification

### CI Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push/PR to `main`:
1. `bun install`
2. `bun run typecheck`
3. `bun run build`
4. `bun test`
5. Integration tests (parallel matrix of 6 jobs): enables KVM, installs Nix, runs each VM test with Nix store caching via `nix-community/cache-nix-action`

## Key Constraints

- `@inkjs/ui` ConfirmInput uses separate `onConfirm`/`onCancel` callbacks (both `() => void`), not a single callback with a boolean parameter
- `execa` v9: `result.exitCode` can be `undefined`, needs `?? 0` fallback
- Docker operations auto-detect: if user is in docker group, sudo is skipped; otherwise sudo is used transparently via `dockerNeedsSudo()` in `shell.ts`
- Homarr is the only app with `configSubdir: "multiple"` (3 dirs: configs, icons, data)
- Caddy is a hidden app (`hidden: true`) — excluded from setup app-select but included in backup/restore/status
- Vaultwarden has `requiresHttps: true` — install command checks `ENABLE_HTTPS` before proceeding; setup wizard skips it with a warning if HTTPS isn't enabled. Its `DOMAIN` env var is derived from `DUCKDNS_SUBDOMAINS` in compose generation.
- `composeUp`/`composeDown` expect a compose **file path** (not directory) — they derive `cwd` via `dirname()`
- Systemd unit uses `/usr/local/bin/mithrandir` directly; only needs `PATH` set (no `BUN_INSTALL`)
- CLI version is in `cli/package.json` (not root `package.json`). `version.tsx` reads from `cli/package.json`.
- `install.sh` symlinks `cli/dist/mithrandir.js` to `/usr/local/bin/mithrandir`

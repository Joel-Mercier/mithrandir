# Local Development

## Prerequisites

- [Bun](https://bun.sh/) runtime
- [Git](https://git-scm.com/)

## Monorepo Structure

The project is a [Bun workspaces](https://bun.sh/docs/install/workspaces) monorepo. Each subproject has its own `package.json` with workspace-scoped dependencies, while the root `package.json` provides global proxy scripts and a single `bun.lock`.

| Workspace | Path | Description |
|-----------|------|-------------|
| `@mithrandir/cli` | `cli/` | Bun/Ink terminal CLI |
| `@mithrandir/docs` | `docs/` | VitePress documentation site |

## Getting Started

```bash
git clone <repo> && cd mithrandir
bun install
```

## Available Scripts

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

## Creating a Release

```bash
scripts/release.sh 1.1.0    # Bumps version, generates changelog, commits, and tags
git push && git push --tags  # Push the release
```

The release script bumps the version in `cli/package.json` and `docs/.vitepress/config.ts`, regenerates `docs/changelog.md` from git tags, creates a commit, and tags it. The changelog groups commits by tag, with unreleased commits shown at the top.

You can also regenerate the changelog manually at any time:

```bash
scripts/generate-changelog.sh
```

## Unit Tests

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

### Snapshots

Snapshot files are stored in `cli/src/__tests__/__snapshots__/` and committed to git. When compose or caddy generation logic changes, update snapshots with:

```bash
bun test --update-snapshots
```

## Integration Tests

VM-based end-to-end tests live in `cli/integration-tests/` using [nix-vm-test](https://github.com/numtide/nix-vm-test). Debian 13 VMs are spun up via QEMU to test critical CLI paths. All tests use Prowlarr as the test app.

### Test Suite

| Test | Description |
|------|-------------|
| `getting-started` | Clone → `install.sh` → `mithrandir --help` |
| `docker-install` | `mithrandir install docker` + idempotency |
| `app-lifecycle` | Install / status / stop / start / restart / uninstall |
| `backup-restore` | Backup, verify, verify --extract, restore |
| `diagnostics` | version, config, health, doctor, capacity, status |
| `update` | `mithrandir update prowlarr --yes` + backup verification |

### Requirements

- Linux host with KVM support (cannot run on macOS directly)
- [Nix](https://nixos.org/) package manager

See `cli/integration-tests/README.md` for details on running locally and writing new tests.

## CI Pipeline

A GitHub Actions workflow runs on every push and pull request to `main`:

1. `bun install`
2. `bun run typecheck` — type checks all workspaces
3. `bun run build` — builds all workspaces
4. `bun run test` — runs tests across all workspaces
5. Integration tests (parallel matrix of 6 jobs): enables KVM, installs Nix, runs each VM test with Nix store caching

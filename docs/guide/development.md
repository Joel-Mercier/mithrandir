# Local Development

## Prerequisites

- [Bun](https://bun.sh/) runtime
- [Git](https://git-scm.com/)

## Getting Started

```bash
git clone <repo> && cd mithrandir
bun install
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run start` | Run the CLI in dev mode (unbundled) |
| `bun run build` | Bundle into `dist/mithrandir.js` |
| `bun test` | Run unit and snapshot tests |
| `bun run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `bun run docs:dev` | Local VitePress dev server with hot reload |
| `bun run docs:build` | Build the documentation site for production |
| `bun run docs:preview` | Preview the built documentation site |
| `bun run release <version>` | Create a new release |

## Creating a Release

```bash
scripts/release.sh 1.1.0    # Bumps version, generates changelog, commits, and tags
git push && git push --tags  # Push the release
```

The release script bumps the version in `package.json` and `docs/.vitepress/config.ts`, regenerates `docs/changelog.md` from git tags, creates a commit, and tags it. The changelog groups commits by tag, with unreleased commits shown at the top.

You can also regenerate the changelog manually at any time:

```bash
scripts/generate-changelog.sh
```

## Unit Tests

Tests use Bun's built-in test runner (`bun test`). Test files are in `src/__tests__/`:

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

Snapshot files are stored in `src/__tests__/__snapshots__/` and committed to git. When compose or caddy generation logic changes, update snapshots with:

```bash
bun test --update-snapshots
```

## Integration Tests

VM-based end-to-end tests live in `integration-tests/` using [nix-vm-test](https://github.com/numtide/nix-vm-test). Debian 13 VMs are spun up via QEMU to test critical CLI paths. All tests use Prowlarr as the test app.

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

See `integration-tests/README.md` for details on running locally and writing new tests.

## CI Pipeline

A GitHub Actions workflow runs on every push and pull request to `main`:

1. `bun install`
2. `bun run typecheck`
3. `bun run build`
4. `bun test`
5. Integration tests (parallel matrix of 6 jobs): enables KVM, installs Nix, runs each VM test with Nix store caching

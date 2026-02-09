# Ink CLI Migration Plan

## Context

The homelab repo has three bash scripts (`setup.sh`, `backup.sh`, `restore.sh`) totaling ~2,200 lines that manage 14 Docker services on Debian/Ubuntu. They work, but the UX is bare-bones `read -rp` prompts and wall-of-text output. The goal is to rewrite them as an Ink (React for CLIs) app using Bun, making the experience more approachable for non-technical users with interactive prompts, spinners, progress indicators, and color.

The bash scripts stay in the repo as a fallback until the Ink CLI is proven stable.

---

## Project Structure

```
cli/
  package.json
  tsconfig.json
  install.sh                          # Bootstrap: installs Bun + deps on bare server
  src/
    index.tsx                          # Entry point, arg parsing, command routing
    types.ts                           # Shared TS types
    lib/
      config.ts                        # .env + backup.conf loading
      apps.ts                          # App registry (single source of truth for all 14 services)
      shell.ts                         # execa wrapper with sudo support
      docker.ts                        # container checks, compose up/down, image pull
      tar.ts                           # zstd tarball create/extract
      rclone.ts                        # upload, download, list, rotate
      compose.ts                       # docker-compose.yml generation from app registry
      systemd.ts                       # service/timer unit generation + install
      distro.ts                        # Debian/Ubuntu detection
      logger.ts                        # Dual-mode: Ink-friendly (TTY) vs plain text (non-TTY)
    commands/
      setup.tsx                        # Setup wizard orchestrator
      backup.tsx                       # Backup command (TTY/non-TTY branching)
      restore.tsx                      # Restore command
      uninstall.tsx                    # Uninstall command
    components/
      Header.tsx                       # Branded banner
      StepIndicator.tsx                # "Step 3 of 7" progress
      AppStatus.tsx                    # Green/red/yellow container status badge
      ErrorBoundary.tsx                # Friendly error display (wraps each command)
```

---

## Dependencies

```json
{
  "dependencies": {
    "ink": "^5.1.0",
    "react": "^18.3.0",
    "@inkjs/ui": "^2.0.0",
    "ink-spinner": "^5.0.0",
    "execa": "^9.6.0",
    "meow": "^13.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/react": "^18.3.0",
    "@types/bun": "latest"
  }
}
```

Key choices:
- **`@inkjs/ui`** — Ink's official component library. Provides `TextInput`, `PasswordInput`, `Select`, `MultiSelect`, `ConfirmInput`, `Spinner`, `StatusMessage`. This replaces the need for individual ink-text-input/ink-select-input packages.
- **`ink-spinner`** — Animated spinner with multiple styles (dots, line, etc.) for long operations.
- **`execa`** — Spawns docker/tar/rclone as child processes. Arguments passed as arrays (no shell injection risk, unlike the bash `run()` that does `sudo bash -c "$1"`).
- **`meow`** — Argument parser from the same author as Ink. Handles `--help`, `--version`, flags, positional args.

---

## Migration Order

### Phase 0: Scaffolding
Create `cli/` directory, config files, `install.sh` bootstrap script, entry point with command routing, verify `bun run cli/src/index.tsx --help` works.

### Phase 1: Shared Library Layer (`lib/`)
Build in dependency order — `shell.ts` first (everything depends on it), then `config.ts`, `apps.ts`, `docker.ts`, `tar.ts`, `rclone.ts`, `compose.ts`, `systemd.ts`, `distro.ts`, `logger.ts`.

The **app registry** (`apps.ts`) is the most important file. It replaces the duplicated `get_app_config()` case statements in `backup.sh:84-133` and `restore.sh:69-118`, the `VALID_APPS` array in `setup.sh:51-54`, and the per-app compose blocks in `setup.sh:499-1087`. One definition per app covers install, backup, restore, and uninstall.

### Phase 2: Backup Command (first command)
Why first: smallest scope (447 lines bash), fewest UI concerns, and the TTY/non-TTY split forces early design decisions that benefit every other command. Can be tested against backups created by the existing bash script.

### Phase 3: Restore Command
Shares most infrastructure with backup. Adds interactive UI (Select for app/date, ConfirmInput before destructive actions, spinners during extraction). Can restore backups created by either the bash or Ink backup.

### Phase 4: Setup Command (last, largest)
1,180 lines of bash → multi-step wizard with the best UX payoff. By this point the component library and lib layer are proven. This is where MultiSelect for app picking, PasswordInput for secrets, and the step indicator shine.

### Phase 5: Integration & Cutover
End-to-end test: `homelab setup` → `homelab backup` → wipe → `homelab restore full`. Point systemd timer at the new CLI. Keep bash scripts as fallback.

---

## Key Design Decisions

### Entry Point (`src/index.tsx`)

```tsx
const command = cli.input[0];
switch (command) {
  case 'setup':    render(<SetupCommand flags={cli.flags} />); break;
  case 'backup':   runBackup(cli.flags); break; // TTY check inside
  case 'restore':  render(<RestoreCommand args={cli.input.slice(1)} flags={cli.flags} />); break;
  case 'uninstall': render(<UninstallCommand app={cli.input[1]} flags={cli.flags} />); break;
  default:         cli.showHelp();
}
```

Simple switch — only 4 commands, no need for a routing framework.

### App Registry (`lib/apps.ts`)

Single source of truth. Each entry defines everything needed across all commands:

```ts
interface AppDefinition {
  name: string;               // "radarr"
  displayName: string;        // "Radarr"
  description: string;        // shown during setup
  image: string;              // Docker image
  port: number | null;        // null for duckdns (background service)
  configSubdir: string;       // "config", "data", "app/config", or "multiple" for homarr
  multipleConfigDirs?: string[]; // homarr: ["configs", "icons", "data"]
  networkMode?: 'host';       // homeassistant
  capAdd?: string[];          // wireguard: ["NET_ADMIN", "SYS_MODULE"]
  needsDataDir: boolean;      // whether it mounts BASE_DIR/data
  secrets?: string[];         // env vars that need prompting: ["ND_SPOTIFY_ID", "ND_SPOTIFY_SECRET"]
  // ... ports, volumes, etc.
}
```

### TTY / Non-TTY Branching (Backup)

Backup runs from systemd timer (non-TTY) daily. The branching happens at the command level:

```tsx
// commands/backup.tsx
export async function runBackup(flags) {
  if (process.stdout.isTTY) {
    const { waitUntilExit } = render(<BackupInteractive />);
    await waitUntilExit();
  } else {
    await runHeadlessBackup(); // plain async function, no React
  }
}
```

Both paths call the same `lib/` functions. The only difference is output:
- **TTY**: Ink renders spinners, progress bars, colored status messages
- **Non-TTY**: Timestamped plain text to stdout + `/var/log/homelab-backup.log` (matches current bash format)

### Setup Wizard Architecture

State machine pattern — orchestrator holds a `step` state, renders the matching child component, child calls `onComplete` to advance:

```
SetupCommand (orchestrator, manages step state)
  ├── DockerInstall        → step 1: check/install Docker
  ├── RcloneInstall        → step 2: check/install rclone
  ├── BaseDirPrompt        → step 3: TextInput for base directory
  ├── AppSelector          → step 4: MultiSelect to pick services
  ├── AppInstaller (loop)  → step 5: per-app install with Spinner
  │     └── SecretPrompt   → conditional: PasswordInput for DuckDNS/WG/Navidrome
  ├── BackupServiceSetup   → step 6: systemd timer
  └── Summary              → step 7: URL table with all service addresses
```

The `--yes` flag auto-selects all apps and skips confirmations (same as bash `AUTO_YES`).

### Systemd Integration

The service unit changes to run the Ink CLI instead of bash:

```ini
ExecStart=/root/.bun/bin/bun run /path/to/cli/src/index.tsx backup
Environment="BUN_INSTALL=/root/.bun"
Environment="PATH=/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin"
```

The `PATH` must be set explicitly because systemd doesn't source `~/.bashrc`. The `systemd.ts` module resolves the absolute Bun path at generation time.

### Bootstrap (`install.sh`)

Targets bare Debian/Ubuntu servers with no Bun/Node. Steps:
1. Install `unzip` + `curl` via apt (needed by Bun installer)
2. Install Bun via `curl -fsSL https://bun.sh/install | bash`
3. `bun install` in the `cli/` directory
4. Print usage instructions

User workflow becomes:
```bash
git clone <repo> && cd homelab
bash cli/install.sh
sudo bun run cli/src/index.tsx setup
```

---

## Verification

After each phase, test against the real system:

1. **Phase 1 (lib)**: Unit-test config loading against the existing `.env` and `backup.conf`. Verify `apps.ts` covers all 14 services and their config path quirks.
2. **Phase 2 (backup)**: Run Ink backup, compare tarballs to bash backup output. Verify headless mode works via `echo | bun run cli/src/index.tsx backup` (piped stdin forces non-TTY).
3. **Phase 3 (restore)**: Restore a bash-created backup using the Ink CLI. Verify containers come back up.
4. **Phase 4 (setup)**: Run `homelab setup --yes` on a fresh system. Verify all containers start and match what bash `setup.sh --yes` produces.
5. **Phase 5 (integration)**: Full cycle — setup → backup → wipe configs → restore full → verify all services running. Test systemd timer fires the Ink CLI and logs correctly.
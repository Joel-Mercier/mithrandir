# Plan: Restructure CLI with Bun Build + homelab Command

## Context

Currently users run sudo bun run cli/src/index.tsx setup — verbose and leaky. The goal is
to use Bun as a build tool to bundle the CLI into a single JS file, then install a
homelab symlink in /usr/local/bin so the command becomes sudo homelab setup. The install
script, systemd units, README, and CLAUDE.md all need updating to reflect this.

## Approach

Use bun build (bundler, not --compile) to produce a single cli/dist/homelab.js file with
a #!/usr/bin/env bun shebang. Symlink /usr/local/bin/homelab → that file. Bun is already
a runtime dependency so no extra overhead.

## Changes

1. Create cli/build.ts — Bun build script (new file)

Uses Bun's programmatic build API:
- Entry: ./src/index.tsx → Output: ./dist/homelab.js, target bun
- Prepends #!/usr/bin/env bun\n shebang to output
- Sets file permissions to 0o755

2. Update cli/package.json

- Add "build": "bun run build.ts" script
- Update "bin" to point to "./dist/homelab.js"
- Keep "start" for dev: "bun run src/index.tsx"

3. Update cli/src/lib/config.ts — getProjectRoot()

Replace the fragile dirname chain (hardcoded depth from cli/src/lib/) with a marker-based
walk-up that works from both source (cli/src/lib/config.ts) and bundled
(cli/dist/homelab.js) locations:

```
export function getProjectRoot(): string {
  let dir = dirname(new URL(import.meta.url).pathname);
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "cli", "package.json"))) return dir;
    dir = dirname(dir);
  }
  throw new Error("Could not find homelab project root");
}
```

4. Update cli/src/lib/systemd.ts

- generateServiceUnit() no longer takes cliEntryPath — uses /usr/local/bin/homelab backup
directly
- Remove BUN_INSTALL env from the unit (no longer needed)
- Keep PATH that includes /usr/local/bin (for env to find bun via the shebang)
- Update installSystemdUnits() to drop the cliEntryPath parameter

5. Update cli/src/commands/setup.tsx (line ~388)

Remove the cliEntry resolution and call installSystemdUnits() with no args (matches
updated signature).

6. Update cli/install.sh

After bun install, add:
- bun run build to build the CLI
- sudo ln -sf "$SCRIPT_DIR/dist/homelab.js" /usr/local/bin/homelab to install the command
- Update final message: sudo homelab setup

7. Update cli/src/commands/uninstall.tsx

In the full system uninstall flow, add removal of /usr/local/bin/homelab symlink
alongside the existing systemd unit cleanup.

8. Update uninstall.sh

Add rm -f /usr/local/bin/homelab to the bash uninstall script for parity.

9. Update README.md

- Quick start: bash cli/install.sh then sudo homelab setup
- All command examples: sudo homelab <command> instead of sudo bun run cli/src/index.tsx
<command>
- Mark the TODO item as done

10. Update CLAUDE.md

- Update the CLI commands section to use homelab instead of bun run cli/src/index.tsx
- Add bun run build to the commands list

Files Modified

- cli/build.ts (new)
- cli/package.json
- cli/src/lib/config.ts
- cli/src/lib/systemd.ts
- cli/src/commands/setup.tsx
- cli/install.sh
- cli/src/commands/uninstall.tsx
- uninstall.sh
- README.md
- CLAUDE.md

## Verification

1. cd cli && bun run build — should produce cli/dist/homelab.js with shebang
2. cd cli && bun run typecheck — TypeScript still compiles clean
3. ./cli/dist/homelab.js --help — should print help text
4. Symlink test: ln -sf $(pwd)/cli/dist/homelab.js /usr/local/bin/homelab && homelab
--help
5. Dev mode still works: bun run cli/src/index.tsx --help
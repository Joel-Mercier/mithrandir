# self-update

Update the Mithrandir CLI from git.

## Usage

```sh
sudo mithrandir self-update
```

## Description

Updates the CLI to the latest version by:

1. Checking git repository status
2. Fetching and pulling latest changes
3. Installing dependencies (`bun install`)
4. Rebuilding the CLI (`bun run build`)
5. Verifying the `/usr/local/bin/mithrandir` symlink

## Notes

- Requires root privileges
- Handles sudo context correctly (uses `SUDO_USER` for git and bun operations)
- Re-creates the symlink if missing

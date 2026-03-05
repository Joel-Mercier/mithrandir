# recover

Full disaster recovery from a remote backup.

## Usage

```sh
sudo mithrandir recover [--yes]
```

## Flags

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Non-interactive mode, auto-proceed through all steps |

## Description

Performs a complete system recovery on a fresh machine. Runs a 9-step process:

1. **Init** — Validate environment
2. **Docker** — Install Docker if needed
3. **rclone** — Install rclone
4. **rclone-remote** — Configure the rclone remote
5. **base-dir** — Create the base directory
6. **discover** — Find available backups on the remote
7. **confirm** — Select which backup to restore
8. **restoring** — Download and extract backup archives
9. **systemd** — Reinstall systemd timer for scheduled backups

## Notes

- Requires root privileges
- Supports both interactive (TTY) and headless (non-TTY) modes
- Designed to be run on a fresh Debian/Ubuntu installation

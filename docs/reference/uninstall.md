# uninstall

Uninstall an app or the entire system.

## Usage

```sh
mithrandir uninstall [app]
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | Optional. App name to uninstall. If omitted, runs a full system uninstall |

## Full System Uninstall

When called without an app argument, runs a 6-phase teardown:

1. Remove systemd units (backup timer/service)
2. Stop and remove all Docker services
3. Purge Docker engine
4. Remove rclone
5. Delete local backups
6. Delete app data directories

## Flags

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Skip confirmation prompts (non-interactive) |

## Notes

- Requires root privileges
- Per-app uninstall also removes companion apps
- Regenerates the Caddyfile after uninstalling an app (if HTTPS is enabled)

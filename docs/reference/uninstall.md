# uninstall

Uninstall an app or completely remove Mithrandir from the system.

## Usage

```sh
mithrandir uninstall [app]
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | Optional. App name to uninstall. If omitted, runs the full system removal flow |

## Per-App Uninstall

When called with an app name, stops and removes the container, companion apps, and optionally deletes the app's data directory. Regenerates the Caddyfile and Gatus config if applicable.

## Full System Removal

When called without an app argument, runs a guided 9-step removal with per-step prompts. Each destructive step can be individually accepted or skipped, allowing you to keep Docker and apps running independently:

1. **Stop all apps** — Stops all Mithrandir-managed Docker containers
2. **Remove systemd services** — Disables and removes `homelab-backup` timer/service, `mithrandir-ui` service, and `mithrandir-tusd` service
3. **Delete local backups** — Removes the backup directory (skippable)
4. **Uninstall rclone** — Removes rclone binary and configuration (skippable)
5. **Remove app data** — Deletes app data/config directories from the base directory (skippable)
6. **Remove Docker** — Purges Docker Engine, containers, images, and volumes (skippable — choosing "no" keeps Docker and apps running independently)
7. **Remove log files** — Cleans up `/var/log/homelab-backup.log`, restore log, and UI update log
8. **Remove CLI** — Removes the `/usr/local/bin/mithrandir` symlink and update check cache
9. **Remove configuration** — Deletes the `.env` file (skippable)

## Flags

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Skip all prompts and remove everything (non-interactive) |

## Notes

- Requires root privileges
- Per-app uninstall also removes companion apps
- Regenerates the Caddyfile after uninstalling an app (if HTTPS is enabled)
- The full removal flow is also available from the web dashboard under Settings > General > Danger Zone

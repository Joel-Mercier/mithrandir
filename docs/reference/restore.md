# restore

Restore app(s) from a backup.

## Usage

```sh
mithrandir restore [--yes] <target> [date]
```

## Arguments

| Argument | Description |
| --- | --- |
| `target` | **Required.** App name or `full` to restore all apps |
| `date` | Optional. Date in `YYYY-MM-DD` format, or `latest`. Defaults to latest |

## Flags

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Skip confirmation prompts |

## Description

Restores an app (or all apps) from a backup archive. The restore process:

1. Discovers available backups — checks local storage first, then tries each configured remote in order until it finds the backup
2. Restores secrets (`.env`, rclone config) before apps if present in the backup
3. Stops the app, extracts the backup archive, and restarts

## Notes

- Requires root privileges
- When restoring `full`, all backed-up apps are restored in sequence

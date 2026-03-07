# backup

Backup apps to local and remote storage.

## Usage

```sh
mithrandir backup [app]
mithrandir backup list [local|remote]
mithrandir backup delete <local|remote> [date] [--yes]
mithrandir backup verify [date] [--remote] [--extract]
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | Optional. Specific app to backup. If omitted, backs up all apps in `APPS` config |

## Subcommands

### `backup list`

List existing backups.

```sh
mithrandir backup list [local|remote]
```

| Argument | Description |
| --- | --- |
| `local` | List only local backups |
| `remote` | List only remote backups |

If no argument is given, lists both local and remote backups.

### `backup delete`

Delete backups by location and optional date.

```sh
mithrandir backup delete <local|remote> [date] [--yes]
```

| Argument | Description |
| --- | --- |
| `local` or `remote` | **Required.** Which backups to delete |
| `date` | Optional. Date in `YYYY-MM-DD` format. If omitted, prompts for selection |

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Skip confirmation prompt |

### `backup verify`

Verify the integrity of backup archives.

```sh
mithrandir backup verify [date] [--remote] [--extract]
```

| Argument | Description |
| --- | --- |
| `date` | Optional. Date in `YYYY-MM-DD` format. Defaults to latest |

| Flag | Description |
| --- | --- |
| `--remote` | Verify remote backups instead of local |
| `--extract` | Test extraction during verification |

## Description

Creates timestamped tar archives of each app's configuration and data directories. Archives are stored locally in `BACKUP_DIR` (default `/backups`) and synced to the configured rclone remote.

Old backups are automatically pruned based on `LOCAL_RETENTION` and `REMOTE_RETENTION` settings.

## Non-TTY Mode

When run from a systemd timer or non-interactive shell, the backup command outputs timestamped plaintext logs to stdout and `/var/log/homelab-backup.log` instead of the interactive UI.

## Related Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `BACKUP_DIR` | `/backups` | Local backup directory |
| `LOCAL_RETENTION` | `5` | Number of local backups to keep |
| `REMOTE_RETENTION` | `10` | Number of remote backups to keep |
| `RCLONE_REMOTE` | `gdrive` | rclone remote name |
| `APPS` | `auto` | Comma-separated app list, or `auto` for all installed |

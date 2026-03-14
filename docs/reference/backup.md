# backup

Backup apps to local and remote storage.

## Usage

```sh
mithrandir backup [app]
mithrandir backup list [local|remote]
mithrandir backup delete [--yes] <local|remote> [date]
mithrandir backup verify [options] [date]
mithrandir backup config
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
mithrandir backup delete [--yes] <local|remote> [date]
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
mithrandir backup verify [options] [date]
```

| Argument | Description |
| --- | --- |
| `date` | Optional. Date in `YYYY-MM-DD` format. Defaults to latest |

| Flag | Description |
| --- | --- |
| `--remote`, `-r` | Verify remote backups instead of local |
| `--extract`, `-x` | Test extraction during verification |

### `backup config`

Interactively view and edit backup settings.

```sh
mithrandir backup config
```

Walks through each backup setting one by one, showing the current value and prompting for a new one. Press Enter to keep the current value.

| Setting | Default | Description |
| --- | --- | --- |
| `BACKUP_DIR` | `/backups` | Local backup directory |
| `LOCAL_RETENTION` | `5` | Number of local backups to keep |
| `REMOTE_RETENTION` | `10` | Number of remote backups to keep |
| `RCLONE_REMOTE` | `gdrive` | rclone remote name |
| `APPS` | `auto` | Apps to backup — `auto` for all installed, or comma-separated list |
| `BACKUP_HOUR` | `2` | Hour of the day (0-23) when automatic backups run |
| `BACKUP_PASSWORD` | *(none)* | Optional encryption password (input is masked) |

If `BACKUP_HOUR` is changed and systemd is available, the backup timer is automatically updated to the new schedule.

## Description

Creates timestamped tar archives of each app's configuration and data directories. Archives are stored locally in `BACKUP_DIR` (default `/backups`) and synced to the configured rclone remote.

Old backups are automatically pruned based on `LOCAL_RETENTION` and `REMOTE_RETENTION` settings.

## Non-TTY Mode

When run from a systemd timer or non-interactive shell, the backup command outputs timestamped plaintext logs to stdout and `/var/log/homelab-backup.log` instead of the interactive UI.

## Encryption

When `BACKUP_PASSWORD` is set in `.env`, all backups are encrypted with AES-256-CBC (via `openssl`) after creation. Encrypted files use the `.tar.zst.enc` extension. Restore and verify commands detect encrypted files automatically and decrypt using the same password.

If a backup is encrypted but no password is available:
- **Restore/recover:** Fails with an error message
- **Verify:** Reports "encrypted" and passes (size check only)

## Related Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `BACKUP_DIR` | `/backups` | Local backup directory |
| `LOCAL_RETENTION` | `5` | Number of local backups to keep |
| `REMOTE_RETENTION` | `10` | Number of remote backups to keep |
| `RCLONE_REMOTE` | `gdrive` | rclone remote name |
| `APPS` | `auto` | Comma-separated app list, or `auto` for all installed |
| `BACKUP_HOUR` | `2` | Hour of the day (0-23) when automatic backups run |
| `BACKUP_PASSWORD` | *(none)* | Optional encryption password for backups |

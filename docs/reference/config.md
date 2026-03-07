# config

Display the current configuration from `.env`.

## Usage

```sh
mithrandir config
```

## Description

Prints a formatted view of all settings from the `.env` file, grouped by category:

- **Core settings** — `BASE_DIR`, `PUID`, `PGID`, `TZ`
- **Backup settings** — `BACKUP_DIR`, `LOCAL_RETENTION`, `REMOTE_RETENTION`, `RCLONE_REMOTE`
- **App-specific secrets** — tokens and keys (values are masked)

## Environment Variables

### Backup

| Variable | Default | Description |
| --- | --- | --- |
| `BACKUP_DIR` | `/backups` | Local backup directory |
| `LOCAL_RETENTION` | `5` | Number of local backups to keep |
| `REMOTE_RETENTION` | `10` | Number of remote backups to keep |
| `RCLONE_REMOTE` | `gdrive` | rclone remote name |
| `APPS` | `auto` | Comma-separated app list, or `auto` for all installed |
| `BACKUP_PASSWORD` | *(none)* | Optional encryption password — encrypts backups with AES-256-CBC |

## Notes

- Does not require root privileges
- Secret values (tokens, passwords) are masked in the output

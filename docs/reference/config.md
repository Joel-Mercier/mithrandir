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

## Notes

- Does not require root privileges
- Secret values (tokens, passwords) are masked in the output

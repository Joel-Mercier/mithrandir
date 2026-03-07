# health

Check system health.

## Usage

```sh
mithrandir health
```

## Description

Runs a series of health checks:

- **Docker** — daemon is running
- **Disk space** — app data and backup directories have sufficient space
- **Backup age** — backups are recent (not stale)
- **Container restarts** — no containers in restart loops
- **Remote backup** — rclone remote is reachable

Each check reports pass/warn/fail status.

## Exit Code

Returns exit code `1` if any check fails, `0` if all pass. Useful for monitoring scripts.

## Non-TTY Mode

Outputs plaintext results when run in a non-interactive shell.

## Notes

- Requires root privileges

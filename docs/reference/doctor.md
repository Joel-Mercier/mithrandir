# doctor

Diagnose setup issues and suggest fixes.

## Usage

```sh
sudo mithrandir doctor
```

## Description

Runs a comprehensive set of diagnostic checks grouped by category:

- **System** — `.env` file exists, Docker installed and running, swap configured
- **Apps** — containers running, config directories exist, required secrets present
- **Backup** — backup directory exists, systemd service and timer installed, rclone configured and remote reachable

Each failing check includes a hint on how to fix the issue.

## Exit Code

Returns exit code `1` if any check fails, `0` if all pass.

## Notes

- Requires root privileges
- Useful for debugging after a fresh install or when something stops working

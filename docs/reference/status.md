# status

Show installed apps and system status.

## Usage

```sh
mithrandir status
```

## Description

Displays an overview of the homelab system:

- Docker daemon status
- Backup timer status and next scheduled run
- Documentation site status
- Table of installed apps showing:
  - Container status (running/stopped)
  - Last backup date
  - Disk usage
  - Access URLs

## Non-TTY Mode

When run in a non-interactive shell, outputs a plaintext table instead of the interactive formatted display.

## Notes

- Requires root privileges (for Docker status checks)

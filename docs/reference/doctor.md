# doctor

Diagnose setup issues and suggest fixes.

## Usage

```sh
mithrandir doctor
```

## Description

Runs a comprehensive set of diagnostic checks grouped by category:

- **System** — `.env` file exists, Docker installed and running, swap configured, firewall rules, and Tailscale (when enabled): installed, `tailscaled` running, connected to the tailnet, subnet routes / exit node awaiting approval, device key expiring within 14 days
- **Apps** — containers running, config directories exist, required secrets present
- **Media** (when qBittorrent and Radarr/Sonarr/Lidarr are installed) — download categories, hardlinks and the cleanup webhook are configured, and how much space unused downloads take (see [`media`](./media))
- **Backup** — backup directory exists, systemd service and timer installed, rclone configured and remote reachable

Each failing check includes a hint on how to fix the issue.

## Exit Code

Returns exit code `1` if any check fails, `0` if all pass.

## Notes

- Requires root privileges
- Useful for debugging after a fresh install or when something stops working

# Home Lab Setup

Automated setup and backup system for Docker-based homelab applications.

## Configuration

### .env File
Contains environment variables for the setup script:
- `BASE_DIR`: Base directory where Docker app folders are located (e.g., `/opt/docker`)

### backup.conf
Backup configuration file:
- `BASE_DIR`: Docker app folders location (falls back to .env if not set)
- `BACKUP_DIR`: Local backup storage directory (default: `/backups`)
- `LOCAL_RETENTION`: Number of local backups to keep (default: `5`)
- `REMOTE_RETENTION`: Number of Google Drive backups to keep (default: `10`)
- `RCLONE_REMOTE`: rclone remote name for Google Drive (default: `gdrive`)
- `APPS`: Apps to backup - `"auto"` to detect installed apps, or space-separated list

### Systemd Service
- **Service**: `systemd/homelab-backup.service`
  - Runs `backup.sh` as a oneshot service
  - Update `ExecStart` path to actual location of `backup.sh`
- **Timer**: `systemd/homelab-backup.timer`
  - Runs daily at 2:00 AM with 0-30 minute randomization
  - Persistent: runs immediately if system was off during scheduled time

Install: Copy service files to `/etc/systemd/system/`, then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now homelab-backup.timer
```

## TODO

- [ ] Replace Uptime Kuma with Gatus which has support for file based configuration (could allow to setup alerts and monitoring directly in the script without using the UI)
- [ ] Check if Profilarr is a good solution for quality profiles
# config

Display the current configuration from `.env`.

## Usage

```sh
mithrandir config
```

## Description

Prints a formatted view of all settings from the `.env` file, grouped by category:

- **Core settings** — `BASE_DIR`, `PUID`, `PGID`, `TZ`
- **Backup settings** — `BACKUP_DIR`, `LOCAL_RETENTION`, `REMOTE_RETENTION`, `RCLONE_REMOTES`
- **App-specific secrets** — tokens and keys (values are masked)

## Environment Variables

### Backup

| Variable | Default | Description |
| --- | --- | --- |
| `BACKUP_DIR` | `/backups` | Local backup directory |
| `LOCAL_RETENTION` | `5` | Number of local backups to keep |
| `REMOTE_RETENTION` | `10` | Number of remote backups to keep |
| `RCLONE_REMOTES` | `gdrive` | Comma-separated list of rclone remote names |
| `APPS` | `auto` | Comma-separated app list, or `auto` for all installed |
| `BACKUP_PASSWORD` | *(none)* | Optional encryption password — encrypts backups with AES-256-CBC |

### Remote Access (Tailscale)

| Variable | Default | Description |
| --- | --- | --- |
| `ENABLE_TAILSCALE` | `false` | Set to `true` by `mithrandir install tailscale` |
| `TAILSCALE_HOSTNAME` | `mithrandir` | Device name on your tailnet |
| `TAILSCALE_ADVERTISE_ROUTES` | `auto` | Subnets shared with the tailnet: `auto` (detected LAN), `none`, or comma-separated CIDRs |
| `TAILSCALE_EXIT_NODE` | `false` | Offer this server as an exit node |
| `TAILSCALE_SSH` | `false` | Enable Tailscale SSH |
| `TAILSCALE_AUTH_KEY` | *(none)* | Optional auth key for unattended login |

See [Remote Access](/guide/remote-access) for details.

## Notes

- Does not require root privileges
- Secret values (tokens, passwords, secrets and `*_KEY` variables) are masked in the output

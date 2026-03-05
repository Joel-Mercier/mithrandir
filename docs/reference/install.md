# install

Install a system component or app.

## Usage

```sh
sudo mithrandir install <target>
```

## Arguments

| Argument | Description |
| --- | --- |
| `target` | **Required.** What to install — see targets below |

## Targets

### System Components

| Target | Description |
| --- | --- |
| `docker` | Install Docker engine on the host (includes swap configuration) |
| `backup` | Install rclone and the backup systemd timer for scheduled backups |
| `https` | Install Caddy as a wildcard HTTPS reverse proxy using DuckDNS DNS-01 challenge |

### Apps

Any app name from the registry can be used as a target. Available apps:

`homarr`, `pihole`, `home-assistant`, `jellyfin`, `jellyseerr`, `sonarr`, `radarr`, `lidarr`, `prowlarr`, `qbittorrent`, `navidrome`, `duckdns`, `wireguard`, `vaultwarden`, `flaresolverr`, `omni-tools`

## Notes

- Requires root privileges
- `install https` requires DuckDNS to be installed and running first, and builds a custom Caddy Docker image with the `caddy-dns/duckdns` module
- Vaultwarden requires `ENABLE_HTTPS=true` in `.env`
- Some apps install companion apps automatically (e.g., `jellyseerr` installs `jellyfin`)

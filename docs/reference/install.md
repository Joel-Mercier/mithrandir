# install

Install a system component, app, or predefined app stack.

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
| `firewall` | Install UFW firewall with ufw-docker for Docker-aware port control |

### Stacks

Install a predefined group of apps in one command. Already-installed apps are skipped automatically.

| Stack | Apps |
| --- | --- |
| `media` | qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin, Navidrome, Lidarr, Immich |
| `media-movies-tv` | qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin |
| `media-music` | Navidrome, Lidarr, qBittorrent |
| `media-pictures` | Immich |
| `automation` | Home Assistant |
| `monitoring` | Gatus |
| `productivity` | Excalidraw, Omni Tools, Open WebUI, Vaultwarden |
| `security` | Pi-hole (Caddy must be installed separately via `install https`) |
| `utilities` | DuckDNS, WireGuard, Homarr |

Examples:
```sh
sudo mithrandir install media-movies-tv    # Install the full movie & TV stack
sudo mithrandir install productivity       # Install productivity apps
sudo mithrandir install utilities          # Install DuckDNS, WireGuard, Homarr
```

### Apps

Any app name from the registry can be used as a target. Available apps:

`homarr`, `pihole`, `home-assistant`, `jellyfin`, `jellyseerr`, `sonarr`, `radarr`, `lidarr`, `prowlarr`, `qbittorrent`, `navidrome`, `duckdns`, `wireguard`, `vaultwarden`, `flaresolverr`, `omni-tools`

## Notes

- Requires root privileges
- `install https` requires DuckDNS to be installed and running first, and builds a custom Caddy Docker image with the `caddy-dns/duckdns` module
- Vaultwarden requires `ENABLE_HTTPS=true` in `.env`
- Some apps install companion apps automatically (e.g., `jellyseerr` installs `jellyfin`)
- Stack installs skip apps that are already installed and include companion apps automatically
- The `security` stack skips Caddy — install it separately with `mithrandir install https`

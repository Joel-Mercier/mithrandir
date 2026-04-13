# install

Install a system component, app, or predefined app stack.

## Usage

```sh
mithrandir install <target>
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
| `media` | qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin, Navidrome, Lidarr, Audiobookshelf, Immich, Profilarr |
| `media-movies-tv` | qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin, Profilarr |
| `media-audio` | Navidrome, Lidarr, Audiobookshelf, qBittorrent |
| `media-pictures` | Immich |
| `media-games` | RetroAssembly |
| `security` | Caddy (HTTPS reverse proxy), Pi-hole (DNS) |

Examples:
```sh
mithrandir install media-movies-tv    # Install the full movie & TV stack
mithrandir install security           # Install Caddy and Pi-hole
```

### Apps

Any app name from the registry can be used as a target. Available apps:

`actualbudget`, `adventurelog`, `affine`, `audiobookshelf`, `bazarr`, `cookcli`, `duckdns`, `excalidraw`, `flaresolverr`, `gatus`, `glance`, `homarr`, `homeassistant`, `immich`, `jellyfin`, `jellyseerr`, `lidarr`, `mealie`, `memos`, `n8n`, `navidrome`, `omni-tools`, `openwebui`, `paperlessngx`, `penpot`, `pihole`, `profilarr`, `prowlarr`, `qbittorrent`, `radarr`, `retroassembly`, `seerr`, `sonarr`, `stirlingpdf`, `sure`, `tandoor`, `trip`, `vaultwarden`, `wireguard`, `yourspotify`

## Notes

- Requires root privileges
- `install https` requires DuckDNS to be installed and running first, and builds a custom Caddy Docker image with the `caddy-dns/duckdns` module
- Vaultwarden requires `ENABLE_HTTPS=true` in `.env`
- Some apps install companion apps automatically (e.g., `jellyseerr` installs `jellyfin`)
- Stack installs skip apps that are already installed and include companion apps automatically
- The `security` stack skips Caddy — install it separately with `mithrandir install https`

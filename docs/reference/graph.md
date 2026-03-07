# graph

Show the inter-app dependency tree.

## Usage

```sh
mithrandir graph
```

Does not require root privileges.

## Output

Displays a color-coded dependency graph organized into four sections:

### Media Pipeline

Shows the data flow through the Arr stack:

```
Prowlarr ───► Radarr  ───► qBittorrent ───► /data/media/movies ───► Jellyfin
    │         Sonarr  ───► qBittorrent ───► /data/media/tv     ───► Jellyfin
    └──────►  Lidarr  ───► qBittorrent ───► /data/media/music  ───► Navidrome

FlareSolverr ───► Prowlarr  (CAPTCHA solving, auto-installed with Prowlarr)
Bazarr       ───► Radarr, Sonarr  (subtitle management)
Seerr        ───► Radarr, Sonarr, Jellyfin  (media requests & discovery)
```

### Network & Security

```
DuckDNS ───► Caddy ───► all apps with ports  (wildcard HTTPS reverse proxy)
Caddy   ───► Vaultwarden  (HTTPS required)
Pi-hole  (standalone DNS, optional wildcard DNS for Caddy)
```

### Standalone

Apps with no dependencies that can be installed independently:

Home Assistant, Immich, Gatus, Homarr, WireGuard, Excalidraw, Omni Tools, Open WebUI

### Recommended Installation Order

The suggested order for installing the full media stack, based on dependencies:

1. qBittorrent (download client)
2. Prowlarr (indexer manager)
3. Radarr (movies)
4. Sonarr (TV)
5. Lidarr (music)
6. Bazarr (subtitles)
7. Jellyfin (media server)
8. Navidrome (music server)
9. Seerr (media requests)

## Notes

- Installed apps are shown in green, uninstalled apps are dimmed
- The graph reads `.env` to determine which apps are installed
- Use `mithrandir install media` to install the entire media stack at once

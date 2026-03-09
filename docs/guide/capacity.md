# Capacity Planning

Mithrandir includes a built-in capacity planning system to help you understand the resource demands of your homelab and anticipate when you might need to upgrade your hardware.

## How It Works

Each app in the registry is assigned two scores:

- **Performance** (Low / Medium / High) — How much CPU and RAM the app typically consumes
- **Storage** (Low / Medium / High) — How much disk space the app uses and how fast it grows

When you run `mithrandir capacity`, the CLI gathers your system's hardware specs (CPU, RAM, disk), checks which apps are installed, and computes aggregate scores to give you a quick overview of your system's capacity.

## Score Reference

| App | Performance | Storage | Notes |
| --- | --- | --- | --- |
| Home Assistant | Medium | Low | Automation engine with integrations and history database |
| qBittorrent | Low | High | Download client, stores torrents and media files |
| Prowlarr | Low | Low | Indexer proxy, minimal resources |
| Radarr | Low | Medium | Movie database and monitoring |
| Sonarr | Low | Medium | TV database and monitoring |
| Bazarr | Low | Low | Subtitle fetching, minimal resources |
| Lidarr | Low | Medium | Music database and monitoring |
| Seerr | Low | Low | Request management UI |
| Homarr | Low | Low | Dashboard, mostly static content |
| Jellyfin | High | High | Media transcoding and large media libraries |
| Navidrome | Low | Low | Music streaming, reads existing files |
| DuckDNS | Low | Low | DNS updater, background service |
| WireGuard | Low | Low | VPN tunnel, kernel module |
| Gatus | Low | Low | Health monitoring, tiny footprint |
| Immich | High | High | ML processing for face detection and search, stores all photos and videos |
| Excalidraw | Low | Low | Client-side whiteboard, minimal server resources |
| Open WebUI | High | Medium | AI chat interface, model inference |
| FlareSolverr | Medium | Low | Headless browser for CAPTCHA solving |
| Omni Tools | Low | Low | Static tool collection |
| Vaultwarden | Low | Low | Password vault, minimal storage |
| Actual Budget | Low | Low | Personal finance, small database |
| Sure | Medium | Low | Rails + Sidekiq workers |
| AFFiNE | Medium | Medium | Knowledge base with PostgreSQL |
| n8n | Medium | Low | Workflow automation engine |
| Penpot | Medium | Medium | Design platform with multiple services |
| Stirling PDF | Medium | Low | PDF processing on demand |
| Profilarr | Low | Low | Profile sync utility |
| TRIP | Low | Low | Travel journal, small database |
| AdventureLog | Medium | Medium | Django backend with PostGIS database |
| Pi-hole | Low | Low | DNS server, minimal resources |

## Verdicts

### Performance Verdict

Based on your aggregate performance score vs. available CPU cores and RAM:

- **Comfortable** — Plenty of headroom, system can handle more apps
- **Adequate** — System is handling the load well
- **Tight** — Resources are stretched, consider upgrading before adding more heavy apps
- **Overloaded** — System may struggle under load, upgrade recommended

### Storage Verdict

Based on the most constrained mount point:

- **Healthy** — Less than 60% used
- **Moderate** — 60-80% used
- **Warning** — 80-95% used
- **Critical** — More than 95% used

## Usage

```sh
mithrandir capacity
```

The command displays:
1. System hardware info (CPU, cores, RAM)
2. Storage usage per mount point with progress bars
3. Per-app resource scores table
4. Aggregate capacity scores with verdicts

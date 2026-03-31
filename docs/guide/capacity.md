# Capacity Planning

Mithrandir includes a built-in capacity planning system to help you understand the resource demands of your homelab and anticipate when you might need to upgrade your hardware.

## How It Works

Each app in the registry is assigned two scores:

- **Performance** (Low / Medium / High) — How much CPU and RAM the app typically consumes
- **Storage** (Low / Medium / High) — How much disk space the app uses and how fast it grows

When you run `mithrandir capacity`, the CLI gathers your system's hardware specs (CPU, RAM, disk), checks which apps are installed, and computes aggregate scores to give you a quick overview of your system's capacity.

## Score Reference

| App            | Performance | Storage | Notes                                                                     |
| -------------- | ----------- | ------- | ------------------------------------------------------------------------- |
| Actual Budget  | Low         | Low     | Personal finance, small database                                          |
| Audiobookshelf | Low         | Medium  | Audiobook and podcast streaming, stores metadata                          |
| AdventureLog   | Medium      | Medium  | Django backend with PostGIS database                                      |
| AFFiNE         | Medium      | Medium  | Knowledge base with PostgreSQL                                            |
| Bazarr         | Low         | Low     | Subtitle fetching, minimal resources                                      |
| CookCLI        | Low         | Low     | Recipe manager using the Cooklang markup language                         |
| DuckDNS        | Low         | Low     | DNS updater, background service                                           |
| Excalidraw     | Low         | Low     | Client-side whiteboard, minimal server resources                          |
| FlareSolverr   | Medium      | Low     | Headless browser for CAPTCHA solving                                      |
| Gatus          | Low         | Low     | Health monitoring, tiny footprint                                         |
| Home Assistant | Medium      | Low     | Automation engine with integrations and history database                  |
| Homarr         | Low         | Low     | Dashboard, mostly static content                                          |
| Immich         | High        | High    | ML processing for face detection and search, stores all photos and videos |
| Jellyfin       | High        | High    | Media transcoding and large media libraries                               |
| Lidarr         | Low         | Medium  | Music database and monitoring                                             |
| n8n            | Medium      | Low     | Workflow automation engine                                                |
| Navidrome      | Low         | Low     | Music streaming, reads existing files                                     |
| Omni Tools     | Low         | Low     | Static tool collection                                                    |
| Open WebUI     | High        | Medium  | AI chat interface, model inference                                        |
| Paperless-ngx  | Medium      | Medium  | Document management system with OCR                                       |
| Penpot         | Medium      | Medium  | Design platform with multiple services                                    |
| Pi-hole        | Low         | Low     | DNS server, minimal resources                                             |
| Profilarr      | Low         | Low     | Profile sync utility                                                      |
| Prowlarr       | Low         | Low     | Indexer proxy, minimal resources                                          |
| qBittorrent    | Low         | High    | Download client, stores torrents and media files                          |
| Radarr         | Low         | Medium  | Movie database and monitoring                                             |
| Seerr          | Low         | Low     | Request management UI                                                     |
| Sonarr         | Low         | Medium  | TV database and monitoring                                                |
| Stirling PDF   | Medium      | Low     | PDF processing on demand                                                  |
| Sure           | Medium      | Low     | Rails + Sidekiq workers                                                   |
| TRIP           | Low         | Low     | Travel journal, small database                                            |
| Vaultwarden    | Low         | Low     | Password vault, minimal storage                                           |
| WireGuard      | Low         | Low     | VPN tunnel, kernel module                                                 |
| Your Spotify   | Low         | Medium  | Spotify history tracking with MongoDB                                     |

## How Scoring Works

Each score level maps to a numeric weight: **Low = 1**, **Medium = 2**, **High = 3**. Only installed apps are counted.

The **aggregate performance score** is the sum of all installed apps' performance weights. For example, if you have Jellyfin (3), Immich (3), Prowlarr (1), and Radarr (1) installed, your total is 8.

This total is then compared against your hardware using a rough heuristic: each score point maps to approximately **0.15 CPU cores** and **200 MB of RAM**. The system computes a **headroom ratio** — your available resources divided by the estimated need — using whichever is more constrained (CPU or RAM).

## Verdicts

### Performance Verdict

Based on the headroom ratio (available resources / estimated need):

| Headroom | Verdict | Meaning |
| --- | --- | --- |
| 3x or more | **Comfortable** | Plenty of headroom, system can handle more apps |
| 1.5x – 3x | **Adequate** | System is handling the load well |
| 0.8x – 1.5x | **Tight** | Resources are stretched, consider upgrading before adding more heavy apps |
| Below 0.8x | **Overloaded** | System may struggle under load, upgrade recommended |

### Storage Verdict

Based on disk usage percentage of the most constrained mount point:

- **Healthy** — Less than 60% used
- **Moderate** — 60-80% used
- **Warning** — 80-95% used
- **Critical** — More than 95% used

::: tip
Storage verdicts are based on actual disk usage, not the app scores. The storage scores in the table above indicate how fast an app's storage tends to grow over time, which helps you plan ahead.
:::

## Usage

```sh
mithrandir capacity
```

The command displays:
1. System hardware info (CPU, cores, RAM)
2. Storage usage per mount point with progress bars
3. Per-app resource scores table
4. Aggregate capacity scores with verdicts

# Apps

Mithrandir supports over 20 self-hosted applications. Each app is installed and managed as a Docker container with persistent configuration and data.

## Managing Apps

```sh
mithrandir install <app>      # Install an app
mithrandir start <app>        # Start a stopped app
mithrandir stop <app>         # Stop a running app
mithrandir restart <app>      # Restart an app
mithrandir update <app>       # Update to the latest image
mithrandir reinstall <app>    # Reinstall from scratch
mithrandir uninstall <app>    # Remove an app
mithrandir log <app>          # View logs
```

## Available Apps

### Media: Movies & TV

| App | Port | Description |
| --- | --- | --- |
| [Jellyfin](./jellyfin) | 8096 | Free media streaming server |
| [Seerr](./seerr) | 5055 | Media request manager for Jellyfin |
| [Sonarr](./sonarr) | 8989 | TV series collection manager |
| [Radarr](./radarr) | 7878 | Movie collection manager |
| [Bazarr](./bazarr) | 6767 | Subtitle manager for Sonarr and Radarr |
| [Prowlarr](./prowlarr) | 9696 | Indexer manager for the *Arr stack |
| [qBittorrent](./qbittorrent) | 8080 | BitTorrent client with web UI |
| [Profilarr](./profilarr) | 6868 | Quality profile manager for Radarr and Sonarr |

### Media: Music

| App | Port | Description |
| --- | --- | --- |
| [Navidrome](./navidrome) | 4533 | Modern music server and streamer |
| [Lidarr](./lidarr) | 8686 | Music collection manager |

### Media: Pictures

| App | Port | Description |
| --- | --- | --- |
| [Immich](./immich) | 2283 | Self-hosted photo and video management |

### Automation

| App | Port | Description |
| --- | --- | --- |
| [Home Assistant](./home-assistant) | 8123 | Open-source home automation platform |
| [n8n](./n8n) | 5678 | Workflow automation platform |

### Monitoring

| App | Port | Description |
| --- | --- | --- |
| [Gatus](./gatus) | 3001 | Automated service health monitoring |

### Productivity

| App | Port | Description |
| --- | --- | --- |
| [AFFiNE](./affine) | 3010 | Privacy-focused knowledge base and workspace |
| [Excalidraw](./excalidraw) | 5000 | Virtual whiteboard for sketching |
| [Omni Tools](./omni-tools) | 8079 | Collection of useful productivity tools |
| [Open WebUI](./open-webui) | 3000 | Self-hosted AI chat interface |
| [Penpot](./penpot) | 9001 | Open-source design and prototyping platform |

### Finance

| App | Port | Description |
| --- | --- | --- |
| [Actual Budget](./actualbudget) | 5006 | Privacy-focused personal finance and budgeting app |
| [Sure](./sure) | 3005 | Privacy-focused personal finance tracker |

### Network & Security

| App | Port | Description |
| --- | --- | --- |
| [Pi-hole](./pihole) | 80 | Network-wide ad blocker and DNS server |
| [WireGuard](./wireguard) | 51820/udp | Fast, modern VPN tunnel |
| [DuckDNS](./duckdns) | — | Free dynamic DNS service |
| [Vaultwarden](./vaultwarden) | 8222 | Lightweight Bitwarden-compatible password manager |

### Utilities

| App | Port | Description |
| --- | --- | --- |
| [Homarr](./homarr) | 7575 | Customizable server dashboard |

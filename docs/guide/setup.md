# Setup Wizard

The setup wizard walks you through configuring your entire homelab. Run it with:

```sh
mithrandir setup
```

## What It Does

The wizard runs through these steps in order:

1. **System initialization** — Detects your OS, local IP, and loads any existing configuration
2. **Docker** — Checks if Docker is installed, and installs it if needed
3. **Swap** — Checks and configures 2 GB of swap space (important for Raspberry Pi and low-RAM systems)
4. **rclone** — Installs rclone for cloud backup support
5. **Base directory** — Confirms the base directory for all app data (defaults to your home directory)
6. **App selection** — Choose which apps to install (by category or individually)
7. **Secrets** — Prompts for any required API tokens, passwords, or keys
8. **Install apps** — Pulls Docker images and starts all selected containers
9. **HTTPS** — Offers to enable HTTPS via Caddy reverse proxy (requires DuckDNS). In `--yes` mode, auto-enables if `ACME_EMAIL` is already configured in `.env`
10. **Firewall** — Offers to enable UFW firewall with ufw-docker to control access to container ports. SSH is always allowed. In `--yes` mode, the firewall is installed automatically
11. **Backup service** — Sets up the systemd timer for daily automatic backups at 2:00 AM
12. **Summary** — Shows all running services with their URLs

## App Selection

You can select apps by category or pick individually:

### Categories

| Category | Apps |
| --- | --- |
| **Media: Movies & TV** | qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin, Profilarr |
| **Media: Audio** | Navidrome, Lidarr, Audiobookshelf |
| **Media: Pictures** | Immich |
| **Media: Games** | RetroAssembly |
| **Automation** | Home Assistant, n8n |
| **Monitoring** | Gatus |
| **Productivity** | AFFiNE, Excalidraw, Omni Tools, Paperless-ngx, Penpot, Stirling PDF |
| **AI** | Open WebUI |
| **Finance** | Actual Budget, Sure |
| **Network & Security** | Pi-hole, WireGuard, DuckDNS, Vaultwarden |
| **Travel** | AdventureLog, TRIP |
| **Statistics** | Your Spotify |
| **Household** | CookCLI, Mealie |
| **Utilities** | Homarr |

Some apps have dependencies that are automatically included. For example, selecting Vaultwarden also installs Caddy, DuckDNS, and Pi-hole.

## Auto-Configuration

After installing apps, the wizard optionally auto-configures integrations between services:

- **qBittorrent** — Sets download paths and credentials
- **Prowlarr** — Connects to Sonarr, Radarr, and Lidarr
- **Radarr / Sonarr / Lidarr** — Configures root folders and download client
- **Jellyfin** — Sets up media libraries
- **Seerr** — Connects to Jellyfin, Sonarr, and Radarr
- **Gatus** — Configures health checks for all installed services

::: warning Known Limitations
Due to API limitations and timing behaviors of some apps, auto-configuration may not always complete fully. Some apps may not be ready to accept API calls immediately after starting, and certain settings can only be configured through the app's web UI. Always double-check each app's configuration after the wizard finishes.
:::

## Configuration File

All settings are saved to a `.env` file in the project root. You can view the current configuration at any time with:

```sh
mithrandir config
```

Key settings include:

| Variable | Default | Description |
| --- | --- | --- |
| `BASE_DIR` | `~` (home directory) | Root directory for all app data |
| `PUID` / `PGID` | `1000` | User/group ID for container file permissions |
| `TZ` | System timezone | Timezone for all containers |
| `BACKUP_DIR` | `/backups` | Local backup storage directory |
| `LOCAL_RETENTION` | `5` | Number of local backups to keep |
| `REMOTE_RETENTION` | `10` | Number of remote backups to keep |
| `RCLONE_REMOTES` | `gdrive` | Comma-separated list of rclone remotes for cloud backups |
| `BACKUP_HOUR` | `2` | Hour (0-23) when the daily backup runs |
| `ENABLE_HTTPS` | `false` | Enable Caddy HTTPS reverse proxy |
| `ENABLE_FIREWALL` | *(not set)* | Enable UFW firewall with automatic rule management |

## Non-Interactive Mode

To run the setup without prompts (useful for scripting), pass `--yes`:

```sh
mithrandir setup --yes
```

In `--yes` mode, the wizard runs unattended with these defaults:

| Step | Behavior |
| --- | --- |
| **Base directory** | Uses existing `BASE_DIR` from `.env`, or defaults to your home directory |
| **App selection** | Installs **all** non-hidden apps (after filtering out conflicts) |
| **Secrets** | Skipped — any secrets not already in `.env` are left unset. Apps that require them will be installed but may not work until you add the missing values manually |
| **Auto-configuration** | Proceeds automatically. Default credentials are `admin` / `admin` for services like qBittorrent, Prowlarr, Radarr, Sonarr, Lidarr, Jellyfin, and Seerr |
| **HTTPS** | Enabled only if `DUCKDNS_TOKEN`, `DUCKDNS_SUBDOMAINS`, and `ACME_EMAIL` are all already set in `.env`. Otherwise skipped silently |
| **Firewall** | Installed and enabled automatically |

::: tip
For a fully unattended setup, pre-populate your `.env` file with all required secrets before running `--yes`. See `.env.example` for the full list of available variables.
:::

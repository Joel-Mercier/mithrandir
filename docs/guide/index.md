# Getting Started

Mithrandir is an automated Docker-based homelab setup, backup, and restore system for Debian and Ubuntu servers. It provides a single CLI to install, configure, and manage a full suite of self-hosted services — from media streaming to home automation to network security.

## Features

- **One-command setup** — Interactive wizard installs Docker, configures services, and starts everything with a single `mithrandir setup` command
- **20+ self-hosted apps** — Media servers, download managers, home automation, ad blocking, VPN, password management, and more
- **Automatic backups** — Daily scheduled backups to local storage and cloud (Google Drive, etc.) via rclone, with configurable retention
- **Disaster recovery** — Restore your entire homelab on a fresh machine from a remote backup with `mithrandir recover`
- **HTTPS out of the box** — Wildcard HTTPS via Caddy reverse proxy with automatic Let's Encrypt certificates using DuckDNS
- **Auto-configuration** — Optional automatic setup of app integrations (Prowlarr → Sonarr/Radarr, Jellyfin libraries, etc.)
- **Health monitoring** — Built-in health checks for Docker, disk space, backup freshness, and container status
- **Self-updating** — Update the CLI and all container images with simple commands

## Requirements

- **OS**: Debian or Ubuntu (including Raspberry Pi OS)
- **Architecture**: x86_64 or ARM64
- **RAM**: 2 GB minimum (4 GB+ recommended)
- **Storage**: Depends on your use case — media libraries need more space
- **Network**: Internet access for pulling Docker images and (optionally) DuckDNS for HTTPS

## Quick Start

```sh
# Clone the repository
git clone https://github.com/your-username/homelab.git
cd homelab

# Install everything (Bun, dependencies, CLI)
sudo bash install.sh

# Run the setup wizard
sudo mithrandir setup
```

The install script handles everything — installing Bun, building the CLI, and creating the `mithrandir` command. See the [Installation](./installation) and [Setup](./setup) pages for detailed instructions.

## How It Works

Mithrandir manages your homelab through a few key concepts:

### App Registry

Every service is defined in a central app registry with its Docker image, ports, volume mounts, environment variables, and dependencies. When you install an app, Mithrandir generates a `docker-compose.yml` from this definition and starts the container.

### Configuration

All settings live in a single `.env` file at the project root. Core settings like `BASE_DIR`, timezone, and user IDs apply globally. Per-app secrets (API tokens, passwords) are stored here too and injected into containers at runtime.

### Backups

A systemd timer triggers daily backups at 2:00 AM. Each app's configuration and data directories are archived into timestamped tarballs, stored locally, and synced to a cloud remote via rclone. Old backups are pruned automatically based on retention settings.

### HTTPS

When enabled, Caddy acts as a wildcard reverse proxy. It obtains Let's Encrypt certificates automatically via DuckDNS DNS-01 challenge. All installed apps get HTTPS endpoints at `appname.yourdomain.duckdns.org`.

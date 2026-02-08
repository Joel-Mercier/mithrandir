# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automated Docker-based homelab setup, backup, and restore system. Three bash scripts manage 14+ self-hosted services (media stack, home automation, networking) on Debian/Ubuntu servers.

## Key Scripts

- **setup.sh** — Interactive installer. Detects distro, installs Docker, creates shared media directory structure, deploys services via per-app docker-compose files under `BASE_DIR` (e.g., `/opt/docker/<app>/`). Generates systemd timer for daily backups. Flags: `--yes` to skip prompts.
- **backup.sh** — Compresses app config dirs into zstd tarballs, stores in `/backups/archive/YYYY-MM-DD/`, uploads to Google Drive via rclone, rotates by retention policy. Auto-detects installed apps or uses `backup.conf` list.
- **restore.sh** — Restores single app or full system from local or remote backups. Usage: `bash restore.sh <app|full> [YYYY-MM-DD|latest] [--yes]`.

## Configuration

- **.env** — User secrets and settings (BASE_DIR, PUID/PGID, TZ, DuckDNS/WireGuard/Spotify credentials). Not in git.
- **backup.conf** — Backup-specific settings (BACKUP_DIR, retention counts, rclone remote name, app list).

## Architecture

- Each service gets its own directory under `BASE_DIR` with a `docker-compose.yml`
- Shared data directory at `BASE_DIR/data/` with `downloads/{movies,tv,music}` and `media/{movies,tv,music}` for the *Arr stack
- Scripts are idempotent — re-running detects existing containers and offers updates
- Some apps have non-standard config paths: `homarr` (configs/icons/data dirs), `jellyseerr` (app/config), `homeassistant`/`navidrome`/`uptime-kuma` (data dir)
- Systemd timer runs backup daily at 02:00 with 30-min random delay; persistent flag catches missed runs

## Services

Home Assistant, qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Lidarr, Jellyseerr, Homarr, Jellyfin, Navidrome, DuckDNS, WireGuard, Uptime Kuma.

## Planned Migration

An Ink (React for CLIs) migration is planned in `.cursor/plans/`. Target runtime is Bun with Node.js fallback. Migration order: bootstrap → backup → restore → setup. Current bash scripts remain until Ink CLI is proven.

## Development Notes

- All scripts require bash 4+ and assume Debian/Ubuntu
- Docker operations require sudo/root
- Scripts use error trapping with stack traces for debugging
- Backup log: `/var/log/homelab-backup.log`
- No test suite exists; validate changes by reading script logic carefully and testing on a target system

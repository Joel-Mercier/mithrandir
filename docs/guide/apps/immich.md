# Immich

Self-hosted photo and video management — a Google Photos alternative with AI-powered search, face recognition, and mobile apps.

| | |
| --- | --- |
| **Image** | `ghcr.io/immich-app/immich-server:release` |
| **Web UI** | `http://your-server:2283` |
| **Config path** | `{BASE_DIR}/immich/postgres` |
| **Data** | `{BASE_DIR}/data/media/pictures` |
| **Website** | [immich.app](https://immich.app/) |
| **Source code** | [GitHub](https://github.com/immich-app/immich) |
| **Android app** | [Play Store](https://play.google.com/store/apps/details?id=app.alextran.immich) |
| **iOS app** | [App Store](https://apps.apple.com/us/app/immich/id1613945652) |

## Installation

```sh
sudo mithrandir install immich
```

## Architecture

Immich is a multi-container app consisting of:

- **immich_server** — Main application server
- **immich_machine_learning** — AI/ML processing (face detection, search, etc.)
- **immich_redis** — Cache layer
- **immich_postgres** — PostgreSQL database with vector extensions

## Optional Secrets

| Variable | Default | Description |
| --- | --- | --- |
| `IMMICH_DB_PASSWORD` | `postgres` | PostgreSQL database password |

## Setup

Complete the onboarding wizard and setup your photos & videos.

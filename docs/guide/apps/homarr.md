# Homarr

Customizable server dashboard — a beautiful home page for all your self-hosted services with live status indicators.

| | |
| --- | --- |
| **Image** | `ghcr.io/ajnart/homarr:latest` |
| **Web UI** | `http://your-server:7575` |
| **Config paths** | `{BASE_DIR}/homarr/configs`, `{BASE_DIR}/homarr/icons`, `{BASE_DIR}/homarr/data` |
| **Website** | [homarr.vercel.app](https://homarr.vercel.app/) |
| **Source code** | [GitHub](https://github.com/ajnart/homarr) |

## Installation

```sh
mithrandir install homarr
```

## Notes

- Homarr has three separate config directories (configs, icons, data) — all are backed up
- Mounts the Docker socket for container management directly from the dashboard

## Setup

Follow the onboarding wizard and create a dashboard.

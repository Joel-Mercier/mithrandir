# ui

Build and serve the UI dashboard.

## Usage

```sh
mithrandir ui
mithrandir ui stop
```

## Subcommands

| Subcommand | Description |
| --- | --- |
| *(none)* | Build the Docker image and start the UI dashboard |
| `stop` | Stop the UI dashboard container |

## Description

Builds a Docker image containing the TanStack Start UI dashboard and serves it on port `4180`.

When Caddy HTTPS is enabled, the Caddyfile is automatically updated to include a reverse proxy entry at `mithrandir.<domain>`.

## Notes

- Requires root privileges
- The UI URL is derived from `ENABLE_HTTPS` and `DUCKDNS_SUBDOMAINS` settings, or falls back to the LAN IP

# docs

Build and serve the documentation website.

## Usage

```sh
mithrandir docs
mithrandir docs stop
```

## Subcommands

| Subcommand | Description |
| --- | --- |
| *(none)* | Build the Docker image and start the docs site |
| `stop` | Stop the docs site container |

## Description

Builds a Docker image containing the VitePress documentation and serves it via nginx on port `4173`.

When Caddy HTTPS is enabled, the Caddyfile is automatically updated to include a reverse proxy entry for the docs site.

## Notes

- Requires root privileges
- The docs URL is derived from `ENABLE_HTTPS` and `DUCKDNS_SUBDOMAINS` settings, or falls back to the LAN IP

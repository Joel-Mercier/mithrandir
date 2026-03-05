# Vaultwarden

Lightweight Bitwarden-compatible password manager — use the official Bitwarden clients (browser extensions, mobile apps, desktop) with your self-hosted server.

| | |
| --- | --- |
| **Image** | `vaultwarden/server:latest` |
| **Web UI** | `https://vaultwarden.yourdomain.duckdns.org` |
| **Config path** | `{BASE_DIR}/vaultwarden/data` |

## Installation

```sh
sudo mithrandir install vaultwarden
```

::: warning HTTPS Required
Vaultwarden requires HTTPS to function. You must have `ENABLE_HTTPS=true` in your `.env` and Caddy installed before installing Vaultwarden. The install command will check this and refuse to proceed without HTTPS.
:::

## Dependencies

Vaultwarden automatically installs these if not already present:

- **Caddy** — HTTPS reverse proxy
- **DuckDNS** — Dynamic DNS for certificate provisioning
- **Pi-hole** — Local DNS resolution

## Setup

<!-- TODO: Add setup instructions with screenshots -->

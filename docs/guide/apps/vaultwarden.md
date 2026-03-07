# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/vaultwarden.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Vaultwarden

Lightweight Bitwarden-compatible password manager — use the official Bitwarden clients (browser extensions, mobile apps, desktop) with your self-hosted server.

| | |
| --- | --- |
| **Image** | `vaultwarden/server:latest` |
| **Web UI** | `https://vaultwarden.yourdomain.duckdns.org` |
| **Config path** | `{BASE_DIR}/vaultwarden/data` |
| **Source code** | [GitHub](https://github.com/dani-garcia/vaultwarden) |

## Installation

```sh
mithrandir install vaultwarden
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

- Follow the onboarding wizard and create a vaultwarden admin account.
- Vaultwarden uses the Bitwarden browser extension to store and use your passwords on login forms. To connect the bitwarden extension to vaultwarden, select "self-hosted" in the extension login screen under the form.

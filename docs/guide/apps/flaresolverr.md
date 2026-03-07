# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/flaresolverr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> FlareSolverr

Proxy server to bypass Cloudflare protection — used by Prowlarr to access Cloudflare-protected indexers.

| | |
| --- | --- |
| **Image** | `ghcr.io/flaresolverr/flaresolverr:latest` |
| **Port** | 8191 |
| **Config path** | `{BASE_DIR}/flaresolverr/config` |
| **Source code** | [GitHub](https://github.com/flaresolverr/flaresolverr) |

## Installation

FlareSolverr is installed automatically as a companion to [Prowlarr](./prowlarr). You don't need to install it separately.

## Notes

- This is a hidden app — it doesn't appear in the setup wizard's app selection
- It's included in backups and status checks like any other app

# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/flaresolverr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> FlareSolverr

Proxy server to bypass Cloudflare protection — used by Prowlarr to access Cloudflare-protected indexers.

::: warning Replaced by Byparr
FlareSolverr no longer bypasses Cloudflare reliably, so new installs use [Byparr](./byparr) instead. Existing FlareSolverr installs are left untouched and keep working with Mithrandir (status, backups, updates). See [Switching from FlareSolverr](./byparr#setup-in-prowlarr) to move over.
:::

| | |
| --- | --- |
| **Image** | `ghcr.io/flaresolverr/flaresolverr:latest` |
| **Port** | 8191 |
| **Config path** | `{BASE_DIR}/flaresolverr/config` |
| **Source code** | [GitHub](https://github.com/flaresolverr/flaresolverr) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Medium — Headless browser |
| **Storage** | Low — No persistent data |

## Installation

FlareSolverr is no longer installed with [Prowlarr](./prowlarr) — [Byparr](./byparr) is installed instead. You can still install it manually if you need it:

```sh
mithrandir install flaresolverr
```

## Notes

- This is a hidden app — it doesn't appear in the setup wizard's app selection
- It's included in backups and status checks like any other app
- Uninstalling Prowlarr also removes FlareSolverr

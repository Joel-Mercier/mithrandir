# DuckDNS

Free dynamic DNS service — keeps a domain name pointed at your home IP address, even if it changes.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/duckdns:latest` |
| **Web UI** | None (background service) |
| **Config path** | `{BASE_DIR}/duckdns/config` |
| **Network** | Host mode |

## Installation

```sh
sudo mithrandir install duckdns
```

## Required Secrets

| Variable | Description |
| --- | --- |
| `DUCKDNS_SUBDOMAINS` | Your DuckDNS subdomain (e.g., `myhomelab`) |
| `DUCKDNS_TOKEN` | Your DuckDNS API token |

Get your subdomain and token at [duckdns.org](https://www.duckdns.org).

## Notes

- DuckDNS is a background service with no web UI
- It periodically updates your DuckDNS domain to point at your current public IP
- Required for HTTPS setup (Caddy uses DuckDNS for certificate provisioning)
- Runs in host networking mode

## Setup

<!-- TODO: Add setup instructions with screenshots -->

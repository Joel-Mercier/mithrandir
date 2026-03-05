# DuckDNS

Free dynamic DNS service — keeps a domain name pointed at your home IP address, even if it changes.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/duckdns:latest` |
| **Web UI** | None (background service) |
| **Config path** | `{BASE_DIR}/duckdns/config` |
| **Network** | Host mode |
| **Website** | [duckdns.org](https://www.duckdns.org) |
| **Source code** | [GitHub](https://github.com/linuxserver/docker-duckdns) |

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

Go to the DuckDNS website, login using one of the provided methods, and add a subdomain. Current IP should be your public IP address. Then make sure to save your token and the subdomain in your `.env` file.

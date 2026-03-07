# HTTPS Setup

Mithrandir can set up wildcard HTTPS for all your services using Caddy and DuckDNS. Once enabled, every app is accessible at `https://appname.yourdomain.duckdns.org`.

## Prerequisites

- A [DuckDNS](https://www.duckdns.org) account with a subdomain and token
- DuckDNS app installed and running (`mithrandir install duckdns`)
- Wildcard DNS configured on your router (see below)

## Installation

```sh
mithrandir install https
```

This will:

1. Build a custom Caddy Docker image with the DuckDNS DNS module
2. Generate a Caddyfile with reverse proxy entries for all installed apps
3. Start Caddy with automatic Let's Encrypt certificate provisioning

## Router Configuration

For HTTPS to work on your local network, configure your router's DNS to resolve all subdomains to your server's LAN IP:

```
*.yourdomain.duckdns.org → 192.168.1.x
```

How to do this depends on your router. If you're using Pi-hole as your DNS server, you can add this as a local DNS record.

## How It Works

Caddy acts as a reverse proxy sitting in front of all your services. It:

1. Obtains a wildcard TLS certificate from Let's Encrypt using the DNS-01 challenge via DuckDNS
2. Automatically renews certificates before they expire
3. Routes `https://appname.yourdomain.duckdns.org` to the correct container port

The Caddyfile is regenerated automatically whenever you install or uninstall an app, so new services are immediately available over HTTPS.

## Configuration

Add these to your `.env`:

| Variable | Description |
| --- | --- |
| `ENABLE_HTTPS` | Set to `true` to enable HTTPS |
| `ACME_EMAIL` | Email for Let's Encrypt notifications (optional but recommended) |
| `DUCKDNS_SUBDOMAINS` | Your DuckDNS subdomain(s) |
| `DUCKDNS_TOKEN` | Your DuckDNS API token |

## Apps Requiring HTTPS

Some apps require HTTPS to function properly:

- **Vaultwarden** — Password manager that requires a secure connection. Will not install unless `ENABLE_HTTPS=true`.
- **Pi-hole** — Requires a secure connection.

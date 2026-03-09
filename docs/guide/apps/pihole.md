# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/pi-hole.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Pi-hole

Network-wide ad blocker and DNS server — blocks ads and trackers for every device on your network.

| | |
| --- | --- |
| **Image** | `pihole/pihole:latest` |
| **Web UI** | `http://your-server/admin` |
| **Config path** | `{BASE_DIR}/pihole/etc-pihole` |
| **Website** | [pi-hole.net](https://pi-hole.net/) |
| **Source code** | [GitHub](https://github.com/pi-hole/pi-hole) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — DNS server |
| **Storage** | Low — Minimal resources |

## Installation

```sh
mithrandir install pihole
```

## Ports

| Port | Protocol | Description |
| --- | --- | --- |
| 80 | TCP | Web UI |
| 53 | TCP/UDP | DNS |
| 443 | TCP | HTTPS (disabled when Caddy is enabled) |

## Secrets

| Variable | Description |
| --- | --- |
| `PIHOLE_PASSWORD` | Password for the Pi-hole web admin interface |

## Notes

Pi-hole requires HTTPS to be setup and enabled in order to function. You must have `ENABLE_HTTPS=true` in your `.env` and Caddy installed before installing Pi-hole. The install command will check this and refuse to proceed without HTTPS.

## Setup

- Add your password to the PIHOLE_PASSWORD environment variable in your `.env` file.
- Login to the Pi-hole web interface at https://pi-hole.yourdomain.duckdns.org
- Go to **Settings → DNS** and add define a primary and secandary DNS server (Cloudflare DNS is recommended) since it doens't log any queries.
- To add blocklists, go to **Lists** and add the lists you want to block. We recommand using the lists that are actively maintained (green) listed on this [website](https://firebog.net/). You can use the first few of every category to get started.
> [!IMPORTANT]
> You need to go to **Tools → Update Gravity** and click on **Update** to update the lists and have them take effect.

- In **Settings → DHCP** you can also setup Pi-hole to handle DHCP instead of using your router's DHCP server if you wish.

## Clients configuration

You need to add your homelab IP address as a primary DNS server for all your devices on your network. As a secondary DNS server, you can use your default router's DNS server or Cloudflare DNS. This will allow your devices to route their traffic through your Pi-hole to filter malicious/tracking domains and to resolve domains like `<app>.homelab.duckdns.org`.
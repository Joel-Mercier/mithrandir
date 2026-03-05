# Pi-hole

Network-wide ad blocker and DNS server — blocks ads and trackers for every device on your network.

| | |
| --- | --- |
| **Image** | `pihole/pihole:latest` |
| **Web UI** | `http://your-server/admin` |
| **Config path** | `{BASE_DIR}/pihole/etc-pihole` |
| **Website** | [pi-hole.net](https://pi-hole.net/) |
| **Source code** | [GitHub](https://github.com/pi-hole/pi-hole) |

## Installation

```sh
sudo mithrandir install pihole
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

# Pi-hole

Network-wide ad blocker and DNS server — blocks ads and trackers for every device on your network.

| | |
| --- | --- |
| **Image** | `pihole/pihole:latest` |
| **Web UI** | `http://your-server/admin` |
| **Config path** | `{BASE_DIR}/pihole/etc-pihole` |

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

## Setup

<!-- TODO: Add setup instructions with screenshots -->

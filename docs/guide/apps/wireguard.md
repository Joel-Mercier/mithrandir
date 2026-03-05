# WireGuard

Fast, modern VPN tunnel — access your homelab remotely from anywhere.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/wireguard:latest` |
| **Port** | 51820/UDP |
| **Config path** | `{BASE_DIR}/wireguard/config` |

## Installation

```sh
sudo mithrandir install wireguard
```

## Required Secrets

| Variable | Description |
| --- | --- |
| `WG_SERVERURL` | Your public IP address or DuckDNS domain |
| `WG_PEERS` | Number of VPN peer configurations to generate |

## Peer Configuration

After installation, peer config files are generated at:

```
{BASE_DIR}/wireguard/config/peer1/peer1.conf
{BASE_DIR}/wireguard/config/peer2/peer2.conf
...
```

Scan the QR code or copy the `.conf` file to your WireGuard client (available on iOS, Android, Windows, macOS, Linux).

## Notes

WireGuard requires the `NET_ADMIN` and `SYS_MODULE` Linux capabilities and mounts `/lib/modules` from the host.

## Setup

<!-- TODO: Add setup instructions with screenshots -->

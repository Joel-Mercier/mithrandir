# WireGuard

Fast, modern VPN tunnel — access your homelab remotely from anywhere.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/wireguard:latest` |
| **Port** | 51820/UDP |
| **Config path** | `{BASE_DIR}/wireguard/config` |
| **Website** | [wireguard.com](https://www.wireguard.com/) |
| **Source code** | [GitHub](https://github.com/WireGuard/WireGuard) |
| **Android app** | [Play Store](https://play.google.com/store/apps/details?id=com.wireguard.android) |
| **iOS app** | [App Store](https://apps.apple.com/us/app/wireguard/id1441195209) |

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

To display the QR code, run

```sh
sudo docker exec wireguard /bin/bash -c 'qrencode -t ansiutf8 {"<"} /config/peer1/peer1.conf'
```

## Notes

WireGuard requires the `NET_ADMIN` and `SYS_MODULE` Linux capabilities and mounts `/lib/modules` from the host.

## Setup

- Add your duckdns domain to the WG_SERVERURL environment variable in your `.env` file.
- Download the WireGuard client app for your platform and scan the QR code to connect to your WireGuard server. Then when you want to access your homelab from another network, open the WireGuard app and tap the "connect" button.

## Clients

Use the official [Android](https://play.google.com/store/apps/details?id=com.wireguard.android) or [iOS](https://apps.apple.com/us/app/wireguard/id1441195209) clients.
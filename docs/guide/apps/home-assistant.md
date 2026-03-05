# Home Assistant

Open-source home automation platform — control and automate your smart home devices from a single dashboard.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/homeassistant:latest` |
| **Web UI** | `http://your-server:8123` |
| **Config path** | `{BASE_DIR}/homeassistant/data` |
| **Network** | Host mode |

## Installation

```sh
sudo mithrandir install home-assistant
```

## Notes

Home Assistant runs in **host networking mode** (not bridged) to allow discovery of devices on your local network. This means it binds directly to port 8123 on your host.

## Setup

<!-- TODO: Add setup instructions with screenshots -->

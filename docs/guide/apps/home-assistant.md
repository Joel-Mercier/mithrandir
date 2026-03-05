# Home Assistant

Open-source home automation platform — control and automate your smart home devices from a single dashboard.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/homeassistant:latest` |
| **Web UI** | `http://your-server:8123` |
| **Config path** | `{BASE_DIR}/homeassistant/data` |
| **Network** | Host mode |
| **Website** | [home-assistant.io](https://www.home-assistant.io/) |
| **Source code** | [GitHub](https://github.com/home-assistant/core) |

## Installation

```sh
sudo mithrandir install homeassistant
```

## Notes

Home Assistant runs in **host networking mode** (not bridged) to allow discovery of devices on your local network. This means it binds directly to port 8123 on your host.

## Setup

Complete the onboarding wizard and setup your smart home & equipments.

# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/gatus.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Gatus

Automated service health monitoring — monitors your services and displays their status on a clean dashboard.

| | |
| --- | --- |
| **Image** | `twinproduction/gatus:latest` |
| **Web UI** | `http://your-server:3001` |
| **Config path** | `{BASE_DIR}/gatus/config`, `{BASE_DIR}/gatus/data` |
| **Website** | [gatus.io](https://gatus.io/) |
| **Source code** | [GitHub](https://github.com/twinproduction/gatus) |

## Installation

```sh
mithrandir install gatus
```

## Auto-Configuration

When installed via the setup wizard, Gatus is automatically configured with health checks for all your installed services.

### Discord Alerts

Gatus can send alerts to a Discord channel when a service goes down or recovers. During the setup wizard you'll be prompted for a Discord webhook URL. To skip the prompt, set `GATUS_DISCORD_WEBHOOK_URL` in your `.env` file before running setup:

```ini
GATUS_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

To create a webhook, go to **Discord → Server Settings → Integrations → Webhooks**.

## Setup

No additional setup required.

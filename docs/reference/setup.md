# setup

Interactive setup wizard that walks through initial homelab configuration.

## Usage

```sh
mithrandir setup
```

## Description

Runs a multi-step interactive wizard that:

1. Configures core settings (`BASE_DIR`, `PUID`/`PGID`, `TZ`)
2. Lets you select which apps to install
3. Validates required secrets (DuckDNS tokens, WireGuard config, etc.)
4. Installs Docker if not present
5. Generates docker-compose files and starts selected apps
6. Optionally connects the server to [Tailscale](/guide/remote-access) for remote access (opt-in)
7. Saves all configuration to `.env`

## Flags

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Skip confirmation prompts |
| `--auth-key <key>` | Tailscale auth key for the remote access step (defaults to `TAILSCALE_AUTH_KEY`). In `--yes` mode, the Tailscale step only runs when a key is available |

## Notes

- Requires root privileges
- Apps that require HTTPS (e.g., Vaultwarden) are skipped with a warning if `ENABLE_HTTPS` is not enabled

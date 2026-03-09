# log

View container logs for an app.

## Usage

```sh
mithrandir log <app> [service] [--follow] [--tail N] [--since TIME]
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | **Required.** App name to view logs for |
| `service` | Service name for multi-container apps (e.g., `backend`, `db`) |

## Flags

| Flag | Description |
| --- | --- |
| `--follow`, `-f` | Follow log output in real time |
| `--tail`, `-n` | Number of lines to show from the end (e.g., `--tail 100`) |
| `--since` | Show logs since a timestamp or relative time (e.g., `--since 1h`, `--since 2024-01-01`) |

## Examples

```sh
# Show last 50 lines of Sonarr logs
mithrandir log sonarr --tail 50

# Follow Pi-hole logs in real time
mithrandir log pihole --follow

# Show Jellyfin logs from the last 2 hours
mithrandir log jellyfin --since 2h

# Show AdventureLog backend logs
mithrandir log adventurelog backend

# Follow Immich postgres logs
mithrandir log immich postgres --follow
```

## Multi-container apps

For apps with multiple containers, you must specify a service name. Running `mithrandir log <app>` without a service will list the available services:

| App | Services |
| --- | --- |
| AdventureLog | `frontend`, `backend`, `db` |
| Immich | `server`, `machine-learning`, `redis`, `postgres` |
| Sure | `web`, `worker`, `redis`, `postgres` |
| AFFiNE | `server`, `migration-job`, `redis`, `postgres` |
| Penpot | `frontend`, `backend`, `exporter`, `postgres`, `valkey`, `mailcatch` |

## Notes

- Requires root privileges
- Press `Ctrl+C` to stop following logs

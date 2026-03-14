# log

View container logs for an app.

## Usage

```sh
mithrandir log [options] <app> [service]
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
| `--since`, `-s` | Show logs since a timestamp or relative time (e.g., `--since 1h`, `--since 2024-01-01`) |

## Examples

```sh
# Show last 50 lines of Sonarr logs
mithrandir log --tail 50 sonarr

# Follow Pi-hole logs in real time
mithrandir log --follow pihole

# Show Jellyfin logs from the last 2 hours
mithrandir log --since 2h jellyfin

# Show AdventureLog backend logs
mithrandir log adventurelog backend

# Follow Immich postgres logs
mithrandir log --follow immich postgres
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

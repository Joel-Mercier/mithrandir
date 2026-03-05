# log

View container logs for an app.

## Usage

```sh
sudo mithrandir log <app> [--follow] [--tail N] [--since TIME]
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | **Required.** App name to view logs for |

## Flags

| Flag | Description |
| --- | --- |
| `--follow`, `-f` | Follow log output in real time |
| `--tail`, `-n` | Number of lines to show from the end (e.g., `--tail 100`) |
| `--since` | Show logs since a timestamp or relative time (e.g., `--since 1h`, `--since 2024-01-01`) |

## Examples

```sh
# Show last 50 lines of Sonarr logs
sudo mithrandir log sonarr --tail 50

# Follow Pi-hole logs in real time
sudo mithrandir log pihole --follow

# Show Jellyfin logs from the last 2 hours
sudo mithrandir log jellyfin --since 2h
```

## Notes

- Requires root privileges
- Press `Ctrl+C` to stop following logs

# restart

Restart a running app.

## Usage

```sh
mithrandir restart <app>
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | **Required.** App name to restart |

## Description

Stops and then starts the app's Docker container. Checks if the container is running before attempting the restart.

## Notes

- Requires root privileges

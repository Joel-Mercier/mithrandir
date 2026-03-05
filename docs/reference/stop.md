# stop

Stop a running app.

## Usage

```sh
sudo mithrandir stop <app>
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | **Required.** App name to stop |

## Description

Stops the app's Docker container using `docker compose down`.

## Notes

- Requires root privileges

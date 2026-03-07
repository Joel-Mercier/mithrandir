# start

Start a stopped app.

## Usage

```sh
mithrandir start <app>
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | **Required.** App name to start |

## Description

Starts the app's Docker container using `docker compose up -d`. If the container is already running, it reports the current status.

## Notes

- Requires root privileges

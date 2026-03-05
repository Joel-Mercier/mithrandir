# reinstall

Reinstall an app from scratch.

## Usage

```sh
sudo mithrandir reinstall <app>
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | **Required.** App name to reinstall |

## Flags

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Skip confirmation to delete data |

## Description

Performs a full reinstall by:

1. Stopping the container
2. Removing the container and image
3. Optionally deleting the app's data directory
4. Recreating and starting the app fresh

## Notes

- Requires root privileges
- Will prompt for confirmation before deleting data unless `--yes` is passed

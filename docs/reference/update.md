# update

Update container images for one or all apps.

## Usage

```sh
sudo mithrandir update [app]
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | Optional. App name to update. If omitted, updates all installed apps |

## Flags

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Skip backup confirmation prompt |

## Description

For each app being updated:

1. Optionally backs up the app before updating (prompts unless `--yes`)
2. Pulls the latest Docker image
3. Compares image IDs to detect if an update is available
4. Recreates the container if the image changed

## Notes

- Requires root privileges
- Skips apps that are already up-to-date

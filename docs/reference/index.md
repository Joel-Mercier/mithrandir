# CLI Reference

Mithrandir is invoked as `mithrandir <command> [options]`. Most commands that modify the system require `sudo`.

## Global Flags

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Skip confirmation prompts |
| `--help` | Show help |

## Commands

### Setup & Configuration

| Command | Description |
| --- | --- |
| [`setup`](./setup) | Interactive setup wizard |
| [`config`](./config) | Show current .env settings |
| [`doctor`](./doctor) | Diagnose setup issues |

### App Management

| Command | Description |
| --- | --- |
| [`install`](./install) | Install an app or system component |
| [`uninstall`](./uninstall) | Uninstall an app or the full system |
| [`reinstall`](./reinstall) | Reinstall an app from scratch |
| [`start`](./start) | Start a stopped app |
| [`stop`](./stop) | Stop a running app |
| [`restart`](./restart) | Restart a running app |
| [`update`](./update) | Update container images |

### Backup & Restore

| Command | Description |
| --- | --- |
| [`backup`](./backup) | Backup apps (with subcommands for list, delete, verify) |
| [`restore`](./restore) | Restore app(s) from backup |
| [`recover`](./recover) | Full disaster recovery from remote backup |

### Monitoring

| Command | Description |
| --- | --- |
| [`status`](./status) | Show installed apps and system status |
| [`health`](./health) | Check system health |
| [`log`](./log) | View container logs |
| [`graph`](./graph) | Show inter-app dependency tree |

### Maintenance

| Command | Description |
| --- | --- |
| [`self-update`](./self-update) | Update the CLI from git |
| [`version`](./version) | Show version and git commit hash |
| [`docs`](./docs) | Build and serve the documentation site |
| [`completions`](./completions) | Generate shell completion scripts |

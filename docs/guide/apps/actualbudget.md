# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/actual-budget.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Actual Budget

Privacy-focused personal finance and budgeting app with local-first data storage, envelope budgeting, and bank syncing.

| | |
| --- | --- |
| **Image** | `docker.io/actualbudget/actual-server:latest` |
| **Web UI** | `http://your-server:5006` |
| **Config path** | `{BASE_DIR}/actualbudget/data` |
| **Website** | [actualbudget.org](https://actualbudget.org/) |
| **Source code** | [GitHub](https://github.com/actualbudget/actual) |

## Installation

```sh
mithrandir install actualbudget
```

Also see [Sure](./sure) for an alternative finance tracker.

## Setup

- Open the web UI at `http://your-server:5006`
- Create a password for your server
- Create a new budget or import an existing one
- Optionally set up bank syncing via GoCardless or SimpleFIN

## Clients

Clients for Windows, macOS, and Linux are available [here](https://github.com/actualbudget/actual/releases).
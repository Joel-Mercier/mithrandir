# Actual Budget

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

Or install the full finance stack:

```sh
mithrandir install finance
```

## Setup

1. Open the web UI at `http://your-server:5006`
2. Create a password for your server
3. Create a new budget or import an existing one
4. Optionally set up bank syncing via GoCardless or SimpleFIN

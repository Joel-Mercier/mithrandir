# n8n

Workflow automation platform — connect apps and automate tasks with a visual editor.

| | |
| --- | --- |
| **Image** | `docker.n8n.io/n8nio/n8n:latest` |
| **Web UI** | `http://your-server:5678` |
| **Config path** | `{BASE_DIR}/n8n/data` |
| **Website** | [n8n.io](https://n8n.io/) |
| **Source code** | [GitHub](https://github.com/n8n-io/n8n) |

## Installation

```sh
mithrandir install n8n
```

## Setup

1. Open the web UI at `http://your-server:5678`
2. Create an owner account on first launch
3. Start building workflows

## Local files

n8n has a `/files` directory mounted at `{BASE_DIR}/n8n/files` for reading and writing local files from workflows.

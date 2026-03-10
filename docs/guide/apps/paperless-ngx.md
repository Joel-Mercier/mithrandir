# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/paperless-ngx.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Paperless-ngx

Document management system that transforms your physical documents into a searchable online archive with OCR.

| | |
| --- | --- |
| **Image** | `ghcr.io/paperless-ngx/paperless-ngx:latest` |
| **Web UI** | `http://your-server:8000` |
| **Config path** | `{BASE_DIR}/paperlessngx/data` |
| **Website** | [docs.paperless-ngx.com](https://docs.paperless-ngx.com/) |
| **Source code** | [GitHub](https://github.com/paperless-ngx/paperless-ngx) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Medium — OCR processing with Redis broker and SQLite database |
| **Storage** | Medium — Stores original documents and OCR data |

## Installation

```sh
mithrandir install paperlessngx
```

## Architecture

Paperless-ngx runs as a multi-container stack:

| Container | Description |
| --- | --- |
| `paperlessngx_webserver` | Main application with web UI (port 8000) |
| `paperlessngx_broker` | Redis broker for task queue |

Data is stored using SQLite (no separate database container needed). Documents are stored in four directories under `{BASE_DIR}/paperlessngx/`:

- `data/` — Application data and SQLite database
- `media/` — Processed documents and thumbnails
- `export/` — Document export directory
- `consume/` — Drop files here to be automatically imported

## Configuration

| Variable | Description |
| --- | --- |
| `PAPERLESS_OCR_LANGUAGE` | Language for OCR processing (default: `eng`). See [available languages](https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions.html) |

When HTTPS is enabled via Caddy, `PAPERLESS_URL` is automatically set to the correct HTTPS URL.

## Setup

- Open the web UI at `http://your-server:8000`
- Create a superuser account: you'll be prompted on first access
- Drop documents into the `consume/` directory or upload them via the web UI

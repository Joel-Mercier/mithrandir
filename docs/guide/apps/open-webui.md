# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/open-webui.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Open WebUI

Self-hosted AI chat interface — a ChatGPT-like UI for running local or remote LLMs.

| | |
| --- | --- |
| **Image** | `ghcr.io/open-webui/open-webui:main` |
| **Web UI** | `http://your-server:3000` |
| **Config path** | `{BASE_DIR}/openwebui/data` |
| **Website** | [openwebui.com](https://openwebui.com/) |
| **Source code** | [GitHub](https://github.com/open-webui/open-webui) |

## Installation

```sh
mithrandir install openwebui
```

## Setup

No additional setup required. 
You can start adding providers for example [OpenAI](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-openai) or [Anthropic (Claude)](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-anthropic).
If you want to run a local model using Ollama, you can [do so too](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-ollama) but you'll need to setup ollama yourself first.
::: warning
Running local models requires very specific and powerful hardware. Make sure you have enough resources to run them.
:::

# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/open-webui.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Open WebUI

Interface de chat IA auto-hébergée — une interface similaire à ChatGPT pour exécuter des LLM locaux ou distants.

| | |
| --- | --- |
| **Image** | `ghcr.io/open-webui/open-webui:main` |
| **Interface web** | `http://your-server:3000` |
| **Chemin de configuration** | `{BASE_DIR}/openwebui/data` |
| **Site web** | [openwebui.com](https://openwebui.com/) |
| **Code source** | [GitHub](https://github.com/open-webui/open-webui) |

## Installation

```sh
mithrandir install openwebui
```

## Configuration

Aucune configuration supplémentaire requise.
Vous pouvez commencer à ajouter des fournisseurs, par exemple [OpenAI](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-openai) ou [Anthropic (Claude)](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-anthropic).
Si vous souhaitez exécuter un modèle local avec Ollama, vous pouvez [le faire également](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-ollama) mais vous devrez d'abord configurer ollama vous-même.
::: warning
L'exécution de modèles locaux nécessite du matériel très spécifique et puissant. Assurez-vous d'avoir suffisamment de ressources pour les exécuter.
:::

# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/home-assistant.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Home Assistant

Plateforme domotique open-source — contrôlez et automatisez vos appareils connectés depuis un tableau de bord unique.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/homeassistant:latest` |
| **Interface web** | `http://your-server:8123` |
| **Chemin de configuration** | `{BASE_DIR}/homeassistant/data` |
| **Réseau** | Mode host |
| **Site web** | [home-assistant.io](https://www.home-assistant.io/) |
| **Code source** | [GitHub](https://github.com/home-assistant/core) |

## Installation

```sh
mithrandir install homeassistant
```

## Notes

Home Assistant fonctionne en **mode réseau host** (et non en mode bridge) pour permettre la découverte des appareils sur votre réseau local. Cela signifie qu'il se lie directement au port 8123 de votre machine hôte.

## Configuration

Complétez l'assistant d'intégration et configurez votre maison connectée et vos équipements.

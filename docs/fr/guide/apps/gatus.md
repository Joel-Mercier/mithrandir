# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/gatus.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Gatus

Surveillance automatisée de l'état des services — surveille vos services et affiche leur statut sur un tableau de bord épuré.

| | |
| --- | --- |
| **Image** | `twinproduction/gatus:latest` |
| **Interface web** | `http://your-server:3001` |
| **Chemin de configuration** | `{BASE_DIR}/gatus/config`, `{BASE_DIR}/gatus/data` |
| **Site web** | [gatus.io](https://gatus.io/) |
| **Code source** | [GitHub](https://github.com/twinproduction/gatus) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Vérifications de santé |
| **Stockage** | Low — Empreinte minimale |

## Installation

```sh
mithrandir install gatus
```

## Configuration automatique

Lorsqu'il est installé via l'assistant de configuration, Gatus est automatiquement configuré avec des vérifications de santé pour tous vos services installés.

### Alertes Discord

Gatus peut envoyer des alertes vers un canal Discord lorsqu'un service tombe en panne ou se rétablit. Pendant l'assistant de configuration, vous serez invité à fournir une URL de webhook Discord. Pour ignorer l'invite, définissez `GATUS_DISCORD_WEBHOOK_URL` dans votre fichier `.env` avant de lancer la configuration :

```ini
GATUS_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Pour créer un webhook, allez dans **Discord → Server Settings → Integrations → Webhooks**.

## Configuration

Aucune configuration supplémentaire requise.

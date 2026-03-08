# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/vaultwarden.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Vaultwarden

Gestionnaire de mots de passe léger compatible Bitwarden — utilisez les clients officiels Bitwarden (extensions navigateur, applications mobiles, bureau) avec votre serveur auto-hébergé.

| | |
| --- | --- |
| **Image** | `vaultwarden/server:latest` |
| **Interface web** | `https://vaultwarden.yourdomain.duckdns.org` |
| **Chemin de configuration** | `{BASE_DIR}/vaultwarden/data` |
| **Code source** | [GitHub](https://github.com/dani-garcia/vaultwarden) |

## Installation

```sh
mithrandir install vaultwarden
```

::: warning HTTPS requis
Vaultwarden nécessite HTTPS pour fonctionner. Vous devez avoir `ENABLE_HTTPS=true` dans votre `.env` et Caddy installé avant d'installer Vaultwarden. La commande d'installation vérifiera cela et refusera de continuer sans HTTPS.
:::

## Dépendances

Vaultwarden installe automatiquement les services suivants s'ils ne sont pas déjà présents :

- **Caddy** — Reverse proxy HTTPS
- **DuckDNS** — DNS dynamique pour le provisionnement des certificats
- **Pi-hole** — Résolution DNS locale

## Configuration

- Suivez l'assistant d'intégration et créez un compte administrateur Vaultwarden.
- Vaultwarden utilise l'extension navigateur Bitwarden pour stocker et utiliser vos mots de passe sur les formulaires de connexion. Pour connecter l'extension Bitwarden à Vaultwarden, sélectionnez "self-hosted" dans l'écran de connexion de l'extension sous le formulaire.

# docs

Construire et servir le site de documentation.

## Utilisation

```sh
mithrandir docs
mithrandir docs stop
```

## Sous-commandes

| Sous-commande | Description |
| --- | --- |
| *(aucune)* | Construire l'image Docker et démarrer le site de documentation |
| `stop` | Arrêter le conteneur du site de documentation |

## Description

Construit une image Docker contenant la documentation VitePress et la sert via Caddy sur le port `4173`.

Lorsque Caddy HTTPS est activé, le Caddyfile est automatiquement mis à jour pour inclure une entrée de reverse proxy pour le site de documentation.

## Remarques

- Nécessite les privilèges root
- L'URL de la documentation est dérivée des paramètres `ENABLE_HTTPS` et `DUCKDNS_SUBDOMAINS`, ou se rabat sur l'IP LAN

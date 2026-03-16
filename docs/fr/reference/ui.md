# ui

Construire et servir le tableau de bord UI.

## Utilisation

```sh
mithrandir ui
mithrandir ui stop
```

## Sous-commandes

| Sous-commande | Description |
| --- | --- |
| *(aucune)* | Construire l'image Docker et démarrer le tableau de bord UI |
| `stop` | Arrêter le conteneur du tableau de bord UI |

## Description

Construit une image Docker contenant le tableau de bord TanStack Start et le sert sur le port `4180`.

Lorsque Caddy HTTPS est activé, le Caddyfile est automatiquement mis à jour pour inclure une entrée de reverse proxy à `mithrandir.<domaine>`.

## Remarques

- Nécessite les privilèges root
- L'URL du tableau de bord est dérivée des paramètres `ENABLE_HTTPS` et `DUCKDNS_SUBDOMAINS`, ou se rabat sur l'IP LAN

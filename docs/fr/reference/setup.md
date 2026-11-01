# setup

Assistant de configuration interactif pour la configuration initiale du homelab.

## Utilisation

```sh
mithrandir setup
```

## Description

Lance un assistant interactif en plusieurs étapes qui :

1. Configure les paramètres principaux (`BASE_DIR`, `PUID`/`PGID`, `TZ`)
2. Vous permet de sélectionner les applications à installer
3. Valide les secrets requis (jetons DuckDNS, configuration WireGuard, etc.)
4. Installe Docker s'il n'est pas présent
5. Génère les fichiers docker-compose et démarre les applications sélectionnées
6. Connecte optionnellement le serveur à [Tailscale](/fr/guide/remote-access) pour l'accès à distance (sur demande)
7. Enregistre toute la configuration dans `.env`

## Options

| Option | Description |
| --- | --- |
| `--yes`, `-y` | Ignorer les invites de confirmation |
| `--auth-key <clé>` | Clé d'authentification Tailscale pour l'étape d'accès à distance (par défaut `TAILSCALE_AUTH_KEY`). En mode `--yes`, l'étape Tailscale n'est exécutée que si une clé est disponible |

## Remarques

- Nécessite les privilèges root
- Les applications nécessitant HTTPS (par ex. Vaultwarden) sont ignorées avec un avertissement si `ENABLE_HTTPS` n'est pas activé

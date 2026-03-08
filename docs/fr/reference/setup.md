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
6. Enregistre toute la configuration dans `.env`

## Options

| Option | Description |
| --- | --- |
| `--yes`, `-y` | Ignorer les invites de confirmation |

## Remarques

- Nécessite les privilèges root
- Les applications nécessitant HTTPS (par ex. Vaultwarden) sont ignorées avec un avertissement si `ENABLE_HTTPS` n'est pas activé

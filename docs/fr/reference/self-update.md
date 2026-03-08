# self-update

Mettre à jour le CLI Mithrandir depuis git.

## Utilisation

```sh
mithrandir self-update
```

## Description

Met à jour le CLI vers la dernière version en :

1. Vérifiant l'état du dépôt git
2. Récupérant et tirant les derniers changements
3. Installant les dépendances (`bun install`)
4. Reconstruisant le CLI (`bun run build`)
5. Vérifiant le lien symbolique `/usr/local/bin/mithrandir`

## Remarques

- Nécessite les privilèges root
- Gère correctement le contexte sudo (utilise `SUDO_USER` pour les opérations git et bun)
- Recrée le lien symbolique s'il est manquant

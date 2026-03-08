# recover

Reprise après sinistre complète depuis une sauvegarde distante.

## Utilisation

```sh
mithrandir recover [--yes]
```

## Options

| Option | Description |
| --- | --- |
| `--yes`, `-y` | Mode non interactif, procéder automatiquement à travers toutes les étapes |

## Description

Effectue une récupération complète du système sur une machine vierge. Exécute un processus en 9 étapes :

1. **Init** — Valider l'environnement
2. **Docker** — Installer Docker si nécessaire
3. **rclone** — Installer rclone
4. **rclone-remote** — Configurer le remote rclone
5. **base-dir** — Créer le répertoire de base
6. **discover** — Trouver les sauvegardes disponibles sur le remote
7. **confirm** — Sélectionner quelle sauvegarde restaurer
8. **restoring** — Télécharger et extraire les archives de sauvegarde
9. **systemd** — Réinstaller le timer systemd pour les sauvegardes programmées

## Remarques

- Nécessite les privilèges root
- Supporte les modes interactif (TTY) et sans écran (non-TTY)
- Conçu pour être exécuté sur une installation fraîche de Debian/Ubuntu

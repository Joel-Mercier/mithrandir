# uninstall

Désinstaller une application ou le système complet.

## Utilisation

```sh
mithrandir uninstall [app]
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | Optionnel. Nom de l'application à désinstaller. Si omis, lance une désinstallation complète du système |

## Désinstallation complète du système

Lorsqu'elle est appelée sans argument d'application, effectue un démontage en 6 phases :

1. Supprimer les unités systemd (timer/service de sauvegarde)
2. Arrêter et supprimer tous les services Docker
3. Purger le moteur Docker
4. Supprimer rclone
5. Supprimer les sauvegardes locales
6. Supprimer les répertoires de données des applications

## Options

| Option | Description |
| --- | --- |
| `--yes`, `-y` | Ignorer les invites de confirmation (non interactif) |

## Remarques

- Nécessite les privilèges root
- La désinstallation d'une application supprime également les applications compagnons
- Régénère le Caddyfile après la désinstallation d'une application (si HTTPS est activé)

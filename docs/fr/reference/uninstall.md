# uninstall

Désinstaller une application ou supprimer complètement Mithrandir du système.

## Utilisation

```sh
mithrandir uninstall [app]
```

## Arguments

| Argument | Description |
| --- | --- |
| `app` | Optionnel. Nom de l'application à désinstaller. Si omis, lance le processus de suppression complète |

## Désinstallation d'une application

Lorsqu'elle est appelée avec un nom d'application, arrête et supprime le conteneur, les applications compagnons, et supprime optionnellement le répertoire de données de l'application. Régénère le Caddyfile et la configuration Gatus si applicable.

## Suppression complète du système

Lorsqu'elle est appelée sans argument, lance un processus de suppression guidé en 9 étapes avec des invites à chaque étape. Chaque étape destructive peut être individuellement acceptée ou ignorée, vous permettant de conserver Docker et vos applications fonctionnant indépendamment :

1. **Arrêter toutes les applications** — Arrête tous les conteneurs Docker gérés par Mithrandir
2. **Supprimer les services systemd** — Désactive et supprime le timer/service `homelab-backup`, le service `mithrandir-ui` et le service `mithrandir-tusd`
3. **Supprimer les sauvegardes locales** — Supprime le répertoire de sauvegarde (optionnel)
4. **Désinstaller rclone** — Supprime le binaire rclone et sa configuration (optionnel)
5. **Supprimer les données des applications** — Supprime les répertoires de données/configuration du répertoire de base (optionnel)
6. **Supprimer Docker** — Purge Docker Engine, les conteneurs, images et volumes (optionnel — choisir « non » conserve Docker et les applications fonctionnant indépendamment)
7. **Supprimer les fichiers journaux** — Nettoie `/var/log/homelab-backup.log`, le journal de restauration et le journal de mise à jour UI
8. **Supprimer le CLI** — Supprime le lien symbolique `/usr/local/bin/mithrandir` et le cache de vérification des mises à jour
9. **Supprimer la configuration** — Supprime le fichier `.env` (optionnel)

## Options

| Option | Description |
| --- | --- |
| `--yes`, `-y` | Ignorer toutes les invites et tout supprimer (non interactif) |

## Remarques

- Nécessite les privilèges root
- La désinstallation d'une application supprime également les applications compagnons
- Régénère le Caddyfile après la désinstallation d'une application (si HTTPS est activé)
- Le processus de suppression complète est également disponible depuis le tableau de bord web sous Paramètres > Général > Zone de danger

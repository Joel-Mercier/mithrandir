# doctor

Diagnostiquer les problèmes de configuration et suggérer des correctifs.

## Utilisation

```sh
mithrandir doctor
```

## Description

Exécute un ensemble complet de vérifications diagnostiques regroupées par catégorie :

- **Système** — le fichier `.env` existe, Docker est installé et en cours d'exécution, le swap est configuré
- **Applications** — les conteneurs sont en cours d'exécution, les répertoires de configuration existent, les secrets requis sont présents
- **Sauvegarde** — le répertoire de sauvegarde existe, le service et le timer systemd sont installés, rclone est configuré et le remote est accessible

Chaque vérification échouée inclut un conseil pour corriger le problème.

## Code de sortie

Retourne le code de sortie `1` si une vérification échoue, `0` si toutes réussissent.

## Remarques

- Nécessite les privilèges root
- Utile pour le débogage après une installation fraîche ou lorsque quelque chose cesse de fonctionner

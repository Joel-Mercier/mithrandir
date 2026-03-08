# health

Vérifier la santé du système.

## Utilisation

```sh
mithrandir health
```

## Description

Exécute une série de vérifications de santé :

- **Docker** — le daemon est en cours d'exécution
- **Espace disque** — les répertoires de données des applications et de sauvegarde disposent d'un espace suffisant
- **Âge des sauvegardes** — les sauvegardes sont récentes (pas obsolètes)
- **Redémarrages de conteneurs** — aucun conteneur en boucle de redémarrage
- **Sauvegarde distante** — le remote rclone est accessible

Chaque vérification rapporte un état réussi/avertissement/échec.

## Code de sortie

Retourne le code de sortie `1` si une vérification échoue, `0` si toutes réussissent. Utile pour les scripts de surveillance.

## Mode non-TTY

Produit des résultats en texte brut lorsqu'elle est exécutée dans un shell non interactif.

## Remarques

- Nécessite les privilèges root

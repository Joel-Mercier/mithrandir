# Planification de capacité

Mithrandir inclut un système de planification de capacité intégré pour vous aider à comprendre les besoins en ressources de votre homelab et anticiper quand vous pourriez avoir besoin de mettre à niveau votre matériel.

## Fonctionnement

Chaque application du registre se voit attribuer deux scores :

- **Performance** (Faible / Moyen / Élevé) — Combien de CPU et de RAM l'application consomme typiquement
- **Stockage** (Faible / Moyen / Élevé) — Combien d'espace disque l'application utilise et à quelle vitesse il croît

Lorsque vous exécutez `mithrandir capacity`, la CLI recueille les spécifications matérielles de votre système (CPU, RAM, disque), vérifie quelles applications sont installées et calcule des scores agrégés pour vous donner un aperçu rapide de la capacité de votre système.

## Référence des scores

| Application    | Performance | Stockage | Notes                                                                                 |
| -------------- | ----------- | -------- | ------------------------------------------------------------------------------------- |
| Actual Budget  | Faible      | Faible   | Finances personnelles, petite base de données                                         |
| Audiobookshelf | Faible      | Moyen    | Streaming de livres audio et podcasts, stocke les métadonnées                         |
| AdventureLog   | Moyen       | Moyen    | Backend Django avec base de données PostGIS                                           |
| AFFiNE         | Moyen       | Moyen    | Base de connaissances avec PostgreSQL                                                 |
| Bazarr         | Faible      | Faible   | Récupération de sous-titres, ressources minimales                                     |
| CookCLI        | Faible      | Faible   | Gestionnaire de recettes utilisant le langage de balisage Cooklang                    |
| DuckDNS        | Faible      | Faible   | Mise à jour DNS, service en arrière-plan                                              |
| Excalidraw     | Faible      | Faible   | Tableau blanc client, ressources serveur minimales                                    |
| FlareSolverr   | Moyen       | Faible   | Navigateur headless pour résolution de CAPTCHA                                        |
| Gatus          | Faible      | Faible   | Surveillance de santé, empreinte minimale                                             |
| Home Assistant | Moyen       | Faible   | Moteur d'automatisation avec intégrations et base de données d'historique             |
| Homarr         | Faible      | Faible   | Tableau de bord, contenu principalement statique                                      |
| Immich         | Élevé       | Élevé    | Traitement ML pour détection faciale et recherche, stocke toutes les photos et vidéos |
| Jellyfin       | Élevé       | Élevé    | Transcodage multimédia et grandes bibliothèques                                       |
| Lidarr         | Faible      | Moyen    | Base de données de musique et surveillance                                            |
| n8n            | Moyen       | Faible   | Moteur d'automatisation de workflows                                                  |
| Navidrome      | Faible      | Faible   | Streaming musical, lit les fichiers existants                                         |
| Omni Tools     | Faible      | Faible   | Collection d'outils statiques                                                         |
| Open WebUI     | Élevé       | Moyen    | Interface de chat IA, inférence de modèle                                             |
| Paperless-ngx  | Moyen       | Moyen    | Gestionnaire de documents avec OCR                                                    |
| Penpot         | Moyen       | Moyen    | Plateforme de design avec plusieurs services                                          |
| Pi-hole        | Faible      | Faible   | Serveur DNS, ressources minimales                                                     |
| Profilarr      | Faible      | Faible   | Utilitaire de synchronisation de profils                                              |
| Prowlarr       | Faible      | Faible   | Proxy d'indexeur, ressources minimales                                                |
| qBittorrent    | Faible      | Élevé    | Client de téléchargement, stocke les torrents et fichiers média                       |
| Radarr         | Faible      | Moyen    | Base de données de films et surveillance                                              |
| Seerr          | Faible      | Faible   | Interface de gestion de demandes                                                      |
| Sonarr         | Faible      | Moyen    | Base de données de séries TV et surveillance                                          |
| Stirling PDF   | Moyen       | Faible   | Traitement PDF à la demande                                                           |
| Sure           | Moyen       | Faible   | Rails + workers Sidekiq                                                               |
| TRIP           | Faible      | Faible   | Journal de voyage, petite base de données                                             |
| Vaultwarden    | Faible      | Faible   | Coffre-fort de mots de passe, stockage minimal                                        |
| WireGuard      | Faible      | Faible   | Tunnel VPN, module noyau                                                              |
| Your Spotify   | Faible      | Moyen    | Suivi d'historique Spotify avec MongoDB                                               |

## Fonctionnement du scoring

Chaque niveau de score correspond à un poids numérique : **Faible = 1**, **Moyen = 2**, **Élevé = 3**. Seules les applications installées sont comptées.

Le **score de performance agrégé** est la somme des poids de performance de toutes les applications installées. Par exemple, si vous avez Jellyfin (3), Immich (3), Prowlarr (1) et Radarr (1) installés, votre total est de 8.

Ce total est ensuite comparé à votre matériel en utilisant une heuristique approximative : chaque point de score correspond à environ **0,15 cœur CPU** et **200 Mo de RAM**. Le système calcule un **ratio de marge** — vos ressources disponibles divisées par le besoin estimé — en utilisant le facteur le plus contraignant (CPU ou RAM).

## Verdicts

### Verdict de performance

Basé sur le ratio de marge (ressources disponibles / besoin estimé) :

| Marge | Verdict | Signification |
| --- | --- | --- |
| 3x ou plus | **Confortable** | Beaucoup de marge, le système peut gérer plus d'applications |
| 1,5x – 3x | **Adéquat** | Le système gère bien la charge |
| 0,8x – 1,5x | **Serré** | Les ressources sont sollicitées, envisagez une mise à niveau avant d'ajouter d'autres applications lourdes |
| Moins de 0,8x | **Surchargé** | Le système peut avoir des difficultés sous charge, mise à niveau recommandée |

### Verdict de stockage

Basé sur le pourcentage d'utilisation du point de montage le plus contraint :

- **Sain** — Moins de 60% utilisé
- **Modéré** — 60-80% utilisé
- **Attention** — 80-95% utilisé
- **Critique** — Plus de 95% utilisé

::: tip
Les verdicts de stockage sont basés sur l'utilisation réelle du disque, pas sur les scores des applications. Les scores de stockage dans le tableau ci-dessus indiquent la vitesse à laquelle le stockage d'une application tend à croître, ce qui vous aide à planifier.
:::

## Utilisation

```sh
mithrandir capacity
```

La commande affiche :
1. Informations matérielles (CPU, cœurs, RAM)
2. Utilisation du stockage par point de montage avec barres de progression
3. Tableau des scores de ressources par application
4. Scores de capacité agrégés avec verdicts

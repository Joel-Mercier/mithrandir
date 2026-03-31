# Assistant de configuration

L'assistant de configuration vous guide à travers la configuration de l'ensemble de votre homelab. Lancez-le avec :

```sh
mithrandir setup
```

## Ce qu'il fait

L'assistant exécute les étapes suivantes dans l'ordre :

1. **Initialisation du système** — Détecte votre OS, votre IP locale et charge toute configuration existante
2. **Docker** — Vérifie si Docker est installé et l'installe si nécessaire
3. **Swap** — Vérifie et configure 2 Go d'espace swap (important pour le Raspberry Pi et les systèmes avec peu de RAM)
4. **rclone** — Installe rclone pour la prise en charge des sauvegardes cloud
5. **Répertoire de base** — Confirme le répertoire de base pour toutes les données d'applications (par défaut votre répertoire personnel)
6. **Sélection des applications** — Choisissez les applications à installer (par catégorie ou individuellement)
7. **Secrets** — Demande les jetons API, mots de passe ou clés nécessaires
8. **Installation des applications** — Télécharge les images Docker et démarre tous les conteneurs sélectionnés
9. **HTTPS** — Propose d'activer le HTTPS via le reverse proxy Caddy (nécessite DuckDNS). En mode `--yes`, s'active automatiquement si `ACME_EMAIL` est déjà configuré dans `.env`
10. **Pare-feu** — Propose d'activer le pare-feu UFW avec ufw-docker pour contrôler l'accès aux ports des conteneurs. SSH est toujours autorisé. En mode `--yes`, le pare-feu est installé automatiquement
11. **Service de sauvegarde** — Configure le timer systemd pour les sauvegardes automatiques quotidiennes à 2h00 du matin
12. **Résumé** — Affiche tous les services en cours d'exécution avec leurs URLs

## Sélection des applications

Vous pouvez sélectionner les applications par catégorie ou individuellement :

### Catégories

| Catégorie | Applications |
| --- | --- |
| **Média : Films et séries** | qBittorrent, Prowlarr, Radarr, Sonarr, Bazarr, Seerr, Jellyfin, Profilarr |
| **Média : Audio** | Navidrome, Lidarr, Audiobookshelf |
| **Média : Photos** | Immich |
| **Automatisation** | Home Assistant, n8n |
| **Surveillance** | Gatus |
| **Productivité** | AFFiNE, Excalidraw, Omni Tools, Paperless-ngx, Penpot, Stirling PDF |
| **IA** | Open WebUI |
| **Finance** | Actual Budget, Sure |
| **Réseau et sécurité** | Pi-hole, WireGuard, DuckDNS, Vaultwarden |
| **Voyage** | AdventureLog, TRIP |
| **Statistiques** | Your Spotify |
| **Maison** | CookCLI |
| **Utilitaires** | Homarr |

Certaines applications ont des dépendances qui sont automatiquement incluses. Par exemple, sélectionner Vaultwarden installe également Caddy, DuckDNS et Pi-hole.

## Configuration automatique

Après l'installation des applications, l'assistant propose optionnellement de configurer automatiquement les intégrations entre les services :

- **qBittorrent** — Configure les chemins de téléchargement et les identifiants
- **Prowlarr** — Se connecte à Sonarr, Radarr et Lidarr
- **Radarr / Sonarr / Lidarr** — Configure les dossiers racine et le client de téléchargement
- **Jellyfin** — Configure les bibliothèques multimédias
- **Seerr** — Se connecte à Jellyfin, Sonarr et Radarr
- **Gatus** — Configure les vérifications de santé pour tous les services installés

::: warning Limitations connues
En raison des limitations des API et du comportement au démarrage de certaines applications, la configuration automatique peut ne pas toujours se terminer complètement. Certaines applications peuvent ne pas être prêtes à accepter des appels API immédiatement après leur démarrage, et certains paramètres ne peuvent être configurés qu'à travers l'interface web de l'application. Vérifiez toujours la configuration de chaque application une fois l'assistant terminé.
:::

## Fichier de configuration

Tous les paramètres sont enregistrés dans un fichier `.env` à la racine du projet. Vous pouvez consulter la configuration actuelle à tout moment avec :

```sh
mithrandir config
```

Les paramètres principaux incluent :

| Variable | Par défaut | Description |
| --- | --- | --- |
| `BASE_DIR` | `~` (répertoire personnel) | Répertoire racine pour toutes les données d'applications |
| `PUID` / `PGID` | `1000` | ID utilisateur/groupe pour les permissions de fichiers des conteneurs |
| `TZ` | Fuseau horaire du système | Fuseau horaire pour tous les conteneurs |
| `BACKUP_DIR` | `/backups` | Répertoire de stockage local des sauvegardes |
| `LOCAL_RETENTION` | `5` | Nombre de sauvegardes locales à conserver |
| `REMOTE_RETENTION` | `10` | Nombre de sauvegardes distantes à conserver |
| `RCLONE_REMOTES` | `gdrive` | Noms des remotes rclone pour les sauvegardes cloud, séparés par des virgules |
| `BACKUP_HOUR` | `2` | Heure (0-23) d'exécution de la sauvegarde quotidienne |
| `ENABLE_HTTPS` | `false` | Activer le reverse proxy HTTPS Caddy |
| `ENABLE_FIREWALL` | *(non défini)* | Activer le pare-feu UFW avec gestion automatique des règles |

## Mode non interactif

Pour lancer la configuration sans invites (utile pour les scripts), passez `--yes` :

```sh
mithrandir setup --yes
```

En mode `--yes`, l'assistant s'exécute sans intervention avec ces valeurs par défaut :

| Étape | Comportement |
| --- | --- |
| **Répertoire de base** | Utilise le `BASE_DIR` existant du `.env`, ou par défaut votre répertoire personnel |
| **Sélection des applications** | Installe **toutes** les applications non cachées (après filtrage des conflits) |
| **Secrets** | Ignorés — les secrets absents du `.env` ne sont pas définis. Les applications qui en ont besoin seront installées mais peuvent ne pas fonctionner tant que vous n'ajoutez pas les valeurs manquantes manuellement |
| **Configuration automatique** | S'exécute automatiquement. Les identifiants par défaut sont `admin` / `admin` pour des services comme qBittorrent, Prowlarr, Radarr, Sonarr, Lidarr, Jellyfin et Seerr |
| **HTTPS** | Activé uniquement si `DUCKDNS_TOKEN`, `DUCKDNS_SUBDOMAINS` et `ACME_EMAIL` sont tous déjà définis dans `.env`. Sinon ignoré silencieusement |
| **Pare-feu** | Installé et activé automatiquement |

::: tip
Pour une configuration entièrement automatisée, pré-remplissez votre fichier `.env` avec tous les secrets nécessaires avant de lancer `--yes`. Consultez `.env.example` pour la liste complète des variables disponibles.
:::

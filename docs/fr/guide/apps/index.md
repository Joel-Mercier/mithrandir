# Applications

Mithrandir prend en charge plus de 30 applications auto-hébergées. Chaque application est installée et gérée en tant que conteneur Docker avec une configuration et des données persistantes.

## Gestion des applications

```sh
mithrandir install <app>      # Installer une application
mithrandir start <app>        # Démarrer une application arrêtée
mithrandir stop <app>         # Arrêter une application en cours
mithrandir restart <app>      # Redémarrer une application
mithrandir update <app>       # Mettre à jour vers la dernière image
mithrandir reinstall <app>    # Réinstaller depuis zéro
mithrandir uninstall <app>    # Supprimer une application
mithrandir log <app> [service] # Voir les logs
```

## Applications disponibles

### Média : Films & Séries TV

| Application | Port | Description |
| --- | --- | --- |
| [Jellyfin](./jellyfin) | 8096 | Serveur de streaming multimédia gratuit |
| [Seerr](./seerr) | 5055 | Gestionnaire de demandes multimédia pour Jellyfin |
| [Sonarr](./sonarr) | 8989 | Gestionnaire de collection de séries TV |
| [Radarr](./radarr) | 7878 | Gestionnaire de collection de films |
| [Bazarr](./bazarr) | 6767 | Gestionnaire de sous-titres pour Sonarr et Radarr |
| [Prowlarr](./prowlarr) | 9696 | Gestionnaire d'indexeurs pour la stack *Arr |
| [qBittorrent](./qbittorrent) | 8080 | Client BitTorrent avec interface web |
| [Profilarr](./profilarr) | 6868 | Gestionnaire de profils de qualité pour Radarr et Sonarr |

### Média : Musique

| Application | Port | Description |
| --- | --- | --- |
| [Navidrome](./navidrome) | 4533 | Serveur et lecteur de musique moderne |
| [Lidarr](./lidarr) | 8686 | Gestionnaire de collection musicale |

### Média : Photos

| Application | Port | Description |
| --- | --- | --- |
| [Immich](./immich) | 2283 | Gestion auto-hébergée de photos et vidéos |

### Automatisation

| Application | Port | Description |
| --- | --- | --- |
| [Home Assistant](./home-assistant) | 8123 | Plateforme domotique open-source |
| [n8n](./n8n) | 5678 | Plateforme d'automatisation de workflows |

### Surveillance

| Application | Port | Description |
| --- | --- | --- |
| [Gatus](./gatus) | 3001 | Surveillance automatisée de l'état des services |

### Productivité

| Application | Port | Description |
| --- | --- | --- |
| [AFFiNE](./affine) | 3010 | Base de connaissances et espace de travail axé sur la confidentialité |
| [Excalidraw](./excalidraw) | 5000 | Tableau blanc virtuel pour dessiner |
| [Omni Tools](./omni-tools) | 8079 | Collection d'outils de productivité utiles |
| [Paperless-ngx](./paperless-ngx) | 8000 | Système de gestion de documents avec OCR |
| [Penpot](./penpot) | 9001 | Plateforme open-source de design et prototypage |
| [Stirling PDF](./stirling-pdf) | 8084 | Outil tout-en-un de manipulation de PDF |


### IA

| Application | Port | Description |
| --- | --- | --- |
| [Open WebUI](./open-webui) | 3000 | Interface de chat IA auto-hébergée |

### Finance

| Application | Port | Description |
| --- | --- | --- |
| [Actual Budget](./actualbudget) | 5006 | Application de finances personnelles et de budget axée sur la confidentialité |
| [Sure](./sure) | 3005 | Suivi de finances personnelles axé sur la confidentialité |

### Réseau & Sécurité

| Application | Port | Description |
| --- | --- | --- |
| [Pi-hole](./pihole) | 80 | Bloqueur de publicités et serveur DNS à l'échelle du réseau |
| [WireGuard](./wireguard) | 51820/udp | Tunnel VPN rapide et moderne |
| [DuckDNS](./duckdns) | — | Service DNS dynamique gratuit |
| [Vaultwarden](./vaultwarden) | 8222 | Gestionnaire de mots de passe léger compatible Bitwarden |

### Voyage

| Application | Port | Description |
| --- | --- | --- |
| [AdventureLog](./adventurelog) | 8015 | Planification de voyages et journal d'aventures |
| [TRIP](./trip) | 8085 | Planification de voyages et journal de bord |

### Statistiques

| Application | Port | Description |
| --- | --- | --- |
| [Your Spotify](./your-spotify) | 3456 | Statistiques d'écoute et historique Spotify |

### Maison

| Application | Port | Description |
| --- | --- | --- |
| [CookCLI](./cookcli) | 9080 | Gestionnaire de recettes utilisant le langage de balisage Cooklang |
| [HortusFox](./hortusfox) | 8089 | Systeme de gestion de plantes auto-heberge |

### Utilitaires

| Application | Port | Description |
| --- | --- | --- |
| [Homarr](./homarr) | 7575 | Tableau de bord serveur personnalisable |
| [FlareSolverr](./flaresolverr) | 8191 | Serveur proxy pour contourner la protection Cloudflare |


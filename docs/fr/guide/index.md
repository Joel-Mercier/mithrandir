# Pour commencer

Mithrandir est un système automatisé de configuration, sauvegarde et restauration de homelab basé sur Docker pour les serveurs Raspberry Pi OS, Debian et Ubuntu. Il fournit une seule CLI pour installer, configurer et gérer une suite complète de services auto-hébergés — du streaming multimédia à la domotique en passant par la sécurité réseau.

::: tip Testé sur
Raspberry Pi 5 avec 4 Go de RAM sous Raspberry Pi OS en mode headless. D'autres systèmes Debian/Ubuntu sur x86_64 ou ARM64 devraient fonctionner mais n'ont pas encore été testés de manière approfondie.
:::

## Fonctionnalités

- **Installation en une commande** — Un assistant interactif installe Docker, configure les services et démarre le tout avec une seule commande `mithrandir setup`
- **Installation par stack** — Installez des groupes d'applications prédéfinies en une seule commande (par ex. `mithrandir install media-movies-tv` pour la stack complète films et séries TV)
- **Plus de 30 applications auto-hébergées** — Serveurs multimédias, gestionnaires de téléchargement, domotique, blocage de publicités, VPN, gestion de mots de passe, et bien plus
- **Sauvegardes automatiques** — Sauvegardes quotidiennes planifiées sur le stockage local et le cloud (Google Drive, etc.) via rclone, avec rétention configurable
- **Reprise après sinistre** — Restaurez l'intégralité de votre homelab sur une nouvelle machine à partir d'une sauvegarde distante avec `mithrandir recover`
- **HTTPS prêt à l'emploi** — HTTPS wildcard via le reverse proxy Caddy avec des certificats Let's Encrypt automatiques via DuckDNS
- **Configuration automatique** — Configuration automatique optionnelle des intégrations entre applications (Prowlarr → Sonarr/Radarr, bibliothèques Jellyfin, etc.)
- **Surveillance de la santé** — Vérifications de santé intégrées pour Docker, l'espace disque, la fraîcheur des sauvegardes et l'état des conteneurs
- **Mise à jour automatique** — Mettez à jour la CLI et toutes les images de conteneurs avec de simples commandes

## Comment ça fonctionne

Mithrandir gère votre homelab à travers quelques concepts clés :

### Registre d'applications

Chaque service est défini dans un registre central d'applications avec son image Docker, ses ports, ses montages de volumes, ses variables d'environnement et ses dépendances. Lorsque vous installez une application, Mithrandir génère un `docker-compose.yml` à partir de cette définition et démarre le conteneur.

### Configuration

Tous les paramètres sont regroupés dans un seul fichier `.env` à la racine du projet. Les paramètres de base comme `BASE_DIR`, le fuseau horaire et les identifiants utilisateur s'appliquent globalement. Les secrets propres à chaque application (jetons API, mots de passe) y sont également stockés et injectés dans les conteneurs au démarrage.

### Sauvegardes

Un timer systemd déclenche des sauvegardes quotidiennes à 2h00 du matin. Les répertoires de configuration et de données de chaque application sont archivés dans des fichiers tar horodatés, stockés localement et synchronisés vers un stockage cloud distant via rclone. Les anciennes sauvegardes sont automatiquement purgées selon les paramètres de rétention.

### HTTPS

Lorsqu'il est activé, Caddy agit comme un reverse proxy wildcard. Il obtient automatiquement des certificats Let's Encrypt via le challenge DNS-01 de DuckDNS. Toutes les applications installées obtiennent des points d'accès HTTPS à `appname.yourdomain.duckdns.org`.

## Prérequis

- **OS** : Debian ou Ubuntu (y compris Raspberry Pi OS)
- **Architecture** : x86_64 ou ARM64
- **RAM** : 2 Go minimum (4 Go ou plus recommandés)
- **Stockage** : Dépend de votre utilisation — les bibliothèques multimédias nécessitent plus d'espace
- **Réseau** : Accès Internet pour télécharger les images Docker et (optionnellement) DuckDNS pour le HTTPS

## Démarrage rapide

```sh
# Cloner le dépôt
git clone https://github.com/Joel-Mercier/mithrandir.git
cd homelab

# Tout installer (Bun, dépendances, CLI)
sudo bash install.sh

# Lancer l'assistant de configuration
mithrandir setup
```

Le script d'installation gère tout — installation de Bun, compilation de la CLI et création de la commande `mithrandir`. Consultez les pages [Installation](./installation) et [Configuration](./setup) pour des instructions détaillées.

## À propos

Ce projet est développé avec l'aide de LLMs et de codage agentique. Bien que l'auteur soit un développeur logiciel professionnel, son expérience principale est dans le développement web et d'applications mobiles.

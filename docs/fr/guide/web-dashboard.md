# Tableau de bord web

Mithrandir inclut un tableau de bord web pour gérer votre homelab depuis un navigateur. Il offre les mêmes fonctionnalités que le CLI dans une interface visuelle, avec authentification, mode sombre et internationalisation.

## Stack technique

| Technologie | Fonction |
|-----------|---------|
| [TanStack Start](https://tanstack.com/start) | Framework SSR full-stack |
| [React 19](https://react.dev/) | Bibliothèque UI |
| [Vite](https://vite.dev/) | Outil de build et serveur de développement |
| [Tailwind CSS v4](https://tailwindcss.com/) | Stylisation utility-first |
| [shadcn/ui](https://ui.shadcn.com/) | Bibliothèque de composants (style New York, base zinc) |
| [TanStack Router](https://tanstack.com/router) | Routage basé sur les fichiers avec SSR |
| [TanStack Query](https://tanstack.com/query) | Gestion d'état serveur et récupération de données |
| [TanStack Form](https://tanstack.com/form) | Gestion de formulaires avec validation Zod |
| [Better-Auth](https://www.better-auth.com/) | Authentification (email/mot de passe + TOTP 2FA) |
| [Drizzle ORM](https://orm.drizzle.team/) | Accès à la base de données SQLite |
| [Paraglide](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) | Internationalisation (anglais, français) |
| [Biome](https://biomejs.dev/) | Linting et formatage |

## Fonctionnalités

### Tableau de bord

La page d'accueil offre une vue d'ensemble de votre homelab :

- **Statut système** — Démon Docker, uptime, infos OS
- **Applications installées** — Grille des applications en cours d'exécution avec indicateurs de statut
- **Statut des sauvegardes** — Date de la dernière sauvegarde, prochaine exécution planifiée, statut du chiffrement
- **Ressources** — Utilisation CPU, RAM et disque
- **Configuration** — Résumé des paramètres `.env` actuels
- **Version** — Version du CLI et disponibilité des mises à jour
- **Docteur** — Lancer les diagnostics directement depuis le tableau de bord

### Gestion des applications

Parcourir, rechercher et gérer les 30+ applications disponibles :

- **Filtrage par catégorie** — Filtrer par multimédia, automatisation, surveillance, productivité, etc.
- **Recherche** — Recherche floue sur les noms et descriptions des applications
- **Détails de l'application** — Afficher les ports, chemins de configuration, scores de capacité et liens externes pour chaque application
- **Contrôles du cycle de vie** — Installer, désinstaller, démarrer, arrêter et redémarrer les applications en un clic
- **Logs en direct** — Diffuser les logs des conteneurs en temps réel directement dans le navigateur

### Graphe de dépendances

Représentation visuelle des dépendances inter-applications. Chaque noeud affiche le statut d'installation, vous aidant à comprendre quelles applications dépendent les unes des autres avant l'installation.

### Planification de capacité

Vue d'ensemble des ressources système avec indicateurs visuels :

- **Spécifications matérielles** — CPU, RAM, disque détectés automatiquement
- **Anneaux de score** — Scores agrégés de performance et de stockage
- **Jauge de stockage** — Utilisation du disque avec seuils d'avertissement
- **Scores par application** — Impact en performance et stockage pour chaque application installée

### Sauvegarde et restauration

Gérer les sauvegardes sans toucher au terminal :

- **Liste des sauvegardes** — Afficher les sauvegardes locales et distantes avec dates et tailles
- **Déclencher une sauvegarde** — Lancer une sauvegarde et suivre la progression
- **Restaurer** — Restaurer des applications individuelles ou le système complet depuis n'importe quelle sauvegarde

### Assistant de configuration

Configuration guidée étape par étape avec le même flux que l'assistant CLI, présenté sous forme de formulaire à étapes visuelles.

### Bibliothèque multimédia

Parcourir les fichiers multimédia stockés sur le serveur avec un explorateur d'arborescence interactif.

### Téléversement de fichiers

Téléverser des fichiers vers le serveur en utilisant des envois résumables via le [protocole tus](https://tus.io/), propulsé par [Uppy](https://uppy.io/). Les fichiers volumineux sont envoyés par morceaux, de sorte que les envois interrompus peuvent reprendre là où ils se sont arrêtés.

### Paramètres

Configurer votre homelab depuis des panneaux de paramètres à onglets :

- **Général** — Répertoire de base, fuseau horaire, IDs utilisateur/groupe
- **Sauvegarde** — Répertoire de sauvegarde, rétention, remotes rclone, chiffrement, planification
- **Réseau** — HTTPS, DuckDNS, paramètres de pare-feu
- **À propos** — Informations système et détails de version

### Profil utilisateur

- Gérer les détails de votre compte
- Afficher et révoquer les sessions actives
- Activer ou désactiver l'authentification à deux facteurs (TOTP)

### Mise à jour automatique

Mettre à jour Mithrandir depuis git directement dans le navigateur. La page de mise à jour affiche une progression étape par étape pendant le téléchargement du code, l'installation des dépendances et la reconstruction.

### Thèmes

Thèmes clair, sombre et automatique (système) avec un bouton dans l'en-tête. La préférence est sauvegardée dans le localStorage.

## Déploiement

### Services systemd

En production, l'interface fonctionne via deux services systemd :

| Service | Port | Description |
|---------|------|-------------|
| `mithrandir-ui.service` | 4180 | Application SSR TanStack Start. Exécute les migrations de base de données au démarrage (`scripts/migrate.ts`), charge les variables d'environnement depuis `.env` et `ui/.env.local`. |
| `mithrandir-tusd.service` | 1080 | Serveur de téléversement résumable [tusd](https://tus.io/). Gère les envois de fichiers par morceaux et transmet les hooks de cycle de vie (`pre-create`, `post-finish`) à l'interface sur `http://localhost:4180/api/media/upload/hooks` pour l'authentification et le traitement. |

Les deux services sont installés automatiquement par `mithrandir ui` et gérés via systemd. Le service tusd démarre avant le service UI (`Before=mithrandir-ui.service`) pour garantir que la gestion des téléversements est prête.

Lorsque le HTTPS Caddy est activé, le Caddyfile est automatiquement régénéré pour faire le reverse-proxy des deux services sous `https://mithrandir.votredomaine.duckdns.org`.

### Déploiements bleu-vert

Les builds utilisent une stratégie de déploiement bleu-vert pour des mises à jour sans interruption :

1. `bun run ui:build` produit la sortie dans `ui/.output/`
2. Le build est copié dans le slot inactif (`ui/.deployments/blue` ou `ui/.deployments/green`)
3. Un swap atomique de lien symbolique pointe `ui/.deployments/current` vers le nouveau slot
4. L'ancien slot et le répertoire de staging sont nettoyés

Le service systemd s'exécute depuis `.deployments/current/server/index.mjs`, donc le basculement est instantané.

### Journal de mise à jour

Les mises à jour déclenchées depuis l'interface web (ou `mithrandir self-update`) enregistrent chaque étape dans :

```
/var/log/mithrandir-ui-update.log
```

Le journal inclut des entrées horodatées pour le git pull, l'installation des dépendances, le build CLI, le build UI, le déploiement et le redémarrage du service. C'est utile pour diagnostiquer les échecs de mise à jour sur les serveurs headless.

### Démarrage et arrêt

```bash
mithrandir ui               # Build, déploiement et démarrage des deux services
mithrandir ui stop          # Arrêt des deux services
```

Si l'interface est déjà en cours d'exécution, `mithrandir ui` le détecte et saute le build. Il s'assure également que tusd est configuré (gère la mise à niveau depuis les versions antérieures sans tusd).

### Variables d'environnement

L'interface nécessite un fichier `ui/.env.local` avec le contenu suivant :

```env
BETTER_AUTH_URL=http://localhost:4180
BETTER_AUTH_SECRET=  # Générer avec : openssl rand -base64 32
```

- `BETTER_AUTH_URL` — L'URL où l'interface est accessible
- `BETTER_AUTH_SECRET` — Un secret de 32 caractères utilisé pour signer les tokens d'authentification. Générez-en un avec `openssl rand -base64 32`.

Lorsque l'interface est démarrée via `mithrandir ui`, ce fichier est généré automatiquement s'il est absent (avec un secret aléatoire et des valeurs par défaut).

::: tip Développement
Pour la configuration de développement local, le serveur de dev et les commandes de test, consultez la page [Développement local](/fr/guide/development#tableau-de-bord-ui).
:::

# Développement local

## Prérequis

- Runtime [Bun](https://bun.sh/)
- [Git](https://git-scm.com/)

## Structure du monorepo

Le projet est un monorepo [Bun workspaces](https://bun.sh/docs/install/workspaces). Chaque sous-projet a son propre `package.json` avec des dépendances par workspace, tandis que le `package.json` racine fournit des scripts proxy globaux et un seul `bun.lock`.

| Workspace | Chemin | Description |
|-----------|--------|-------------|
| `@mithrandir/cli` | `cli/` | CLI terminal Bun/Ink |
| `@mithrandir/docs` | `docs/` | Site de documentation VitePress |
| `@mithrandir/ui` | `ui/` | Tableau de bord web TanStack Start |

## Pour commencer

```bash
git clone https://github.com/Joel-Mercier/mithrandir.git && cd mithrandir
bun install
```

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `bun run cli:start` | Lancer la CLI en mode dev (non bundlé) |
| `bun run cli:build` | Bundler dans `cli/dist/mithrandir.js` |
| `bun run cli:test` | Lancer les tests unitaires et de snapshot de la CLI |
| `bun run cli:typecheck` | Vérification de types TypeScript pour la CLI |
| `bun run ui:dev` | Serveur de dev Vite local avec rechargement à chaud |
| `bun run ui:build` | Construire l'UI pour la production |
| `bun run ui:preview` | Prévisualiser l'UI construit |
| `bun run ui:test` | Lancer les tests unitaires et de snapshot de l'UI |
| `bun run ui:format` | Formater tous les fichiers de l'UI |
| `bun run ui:lint` | Vérifier tous les fichiers de l'UI |
| `bun run ui:check` | Vérification Biome pour l'UI |
| `bun run ui:typecheck` | Vérification de types TypeScript pour l'UI |
| `bun run build` | Construire tous les workspaces |
| `bun run test` | Lancer les tests de tous les workspaces |
| `bun run typecheck` | Vérification de types pour tous les workspaces |
| `bun run docs:dev` | Serveur de dev VitePress local avec rechargement à chaud |
| `bun run docs:build` | Construire le site de documentation pour la production |
| `bun run docs:preview` | Prévisualiser le site de documentation construit |
| `bun run release <version>` | Créer une nouvelle version |

## Créer une version

```bash
scripts/release.sh 1.1.0    # Incrémente la version, génère le changelog, commit et tag
git push && git push --tags  # Pousser la version
```

Le script de release incrémente la version dans `cli/package.json` et `docs/.vitepress/config.ts`, régénère `docs/changelog.md` à partir des tags git, crée un commit et le tag. Le changelog regroupe les commits par tag, avec les commits non publiés affichés en haut.

Vous pouvez aussi régénérer le changelog manuellement à tout moment :

```bash
scripts/generate-changelog.sh
```

## Tableau de bord UI

Le tableau de bord web est une application TanStack Start dans le workspace `ui/`. Pour un aperçu des fonctionnalités et du déploiement en production, consultez la page [Tableau de bord web](/fr/guide/web-dashboard).

### Serveur de développement

```bash
bun run ui:dev          # Serveur de dev sur le port 3000 avec rechargement à chaud
```

Créez un fichier `ui/.env.local` pour le développement :

```env
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=  # openssl rand -base64 32
```

### Construction

```bash
bun run ui:build        # Build pour la production
bun run ui:preview      # Prévisualiser le build de production
```

### Tests et linting

```bash
bun run ui:test         # Lancer les tests unitaires Vitest
bun run ui:typecheck    # Vérification des types TypeScript
bun run ui:lint         # Lint avec Biome
bun run ui:format       # Formatage avec Biome
bun run ui:check        # Vérification Biome (lint + format)
```

## Tests unitaires

Les tests utilisent le runner de tests intégré de Bun. Les fichiers de test sont dans `cli/src/__tests__/` :

- **Registre d'apps** (`apps.test.ts`) — valide les recherches d'apps, noms de conteneurs, chemins de config, filtrage de conflits, stacks et intégrité du registre
- **Parsing de config** (`config.test.ts`) — teste le chargement de `.env` (KEY=VALUE, guillemets, préfixe `export`, commentaires) et les valeurs par défaut de config de backup
- **Génération compose** (`compose.test.ts`) — tests de snapshot pour la sortie docker-compose.yml pour tous les types d'apps (standard, réseau hôte, secrets, healthchecks, capabilities, multi-config, remapping de ports, rawCompose)
- **Génération Caddy** (`caddy.test.ts`) — teste la dérivation de domaine, la génération de Caddyfile, la page 404 et la sortie Dockerfile
- **Utilitaires de backup** (`backup-utils.test.ts`) — suppression de suffixe d'archive, détection d'archive de backup et génération de nom de fichier d'archive
- **Crypto** (`crypto.test.ts`) — détection de fichier de backup chiffré
- **Systemd** (`systemd.test.ts`) — génération d'unités service et timer avec tests de snapshot
- **Swap** (`swap.test.ts`) — formatage de taille swap (seuils GB/MB, cas limites)
- **Logger** (`logger.test.ts`) — formatage de messages de log, validation de pattern de timestamp et constantes de chemin de log

### Snapshots

Les fichiers de snapshot sont stockés dans `cli/src/__tests__/__snapshots__/` et commités dans git. Lorsque la logique de génération compose ou caddy change, mettez à jour les snapshots avec :

```bash
bun test --update-snapshots
```

## Tests d'intégration

Les tests end-to-end basés sur des VMs se trouvent dans `cli/integration-tests/` et utilisent [nix-vm-test](https://github.com/numtide/nix-vm-test). Des VMs Debian 13 sont lancées via QEMU pour tester les chemins critiques de la CLI. Tous les tests utilisent Prowlarr comme app de test.

### Suite de tests

| Test | Description |
|------|-------------|
| `getting-started` | Clone → `install.sh` → `mithrandir --help` |
| `docker-install` | `mithrandir install docker` + idempotence |
| `app-lifecycle` | Install / status / stop / start / restart / uninstall |
| `backup-restore` | Backup, verify, verify --extract, restore |
| `diagnostics` | version, config, health, doctor, capacity, status |
| `update` | `mithrandir update prowlarr --yes` + vérification de backup |

### Prérequis

- Hôte Linux avec support KVM (ne peut pas tourner sur macOS directement)
- Gestionnaire de paquets [Nix](https://nixos.org/)

Voir `cli/integration-tests/README.md` pour les détails sur l'exécution locale et l'écriture de nouveaux tests.

## Pipeline CI

Un workflow GitHub Actions s'exécute à chaque push et pull request sur `main` :

1. `bun install`
2. `bun run typecheck` — vérifie les types de tous les workspaces
3. `bun run build` — construit tous les workspaces
4. `bun run test` — lance les tests de tous les workspaces
5. Tests d'intégration (matrice parallèle de 6 jobs) : active KVM, installe Nix, exécute chaque test VM avec cache du store Nix

# Développement local

## Prérequis

- Runtime [Bun](https://bun.sh/)
- [Git](https://git-scm.com/)

## Pour commencer

```bash
git clone <repo> && cd mithrandir
bun install
```

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `bun run start` | Lancer le CLI en mode dev (non bundlé) |
| `bun run build` | Bundler dans `dist/mithrandir.js` |
| `bun test` | Lancer les tests unitaires et de snapshot |
| `bun run typecheck` | Vérification de types TypeScript (`tsc --noEmit`) |
| `bun run docs:dev` | Serveur de dev VitePress local avec rechargement à chaud |
| `bun run docs:build` | Construire le site de documentation pour la production |
| `bun run docs:preview` | Prévisualiser le site de documentation construit |
| `bun run release <version>` | Créer une nouvelle version |

## Créer une version

```bash
scripts/release.sh 1.1.0    # Incrémente la version, génère le changelog, commit et tag
git push && git push --tags  # Pousser la version
```

Le script de release incrémente la version dans `package.json` et `docs/.vitepress/config.ts`, régénère `docs/changelog.md` à partir des tags git, crée un commit et le tag. Le changelog regroupe les commits par tag, avec les commits non publiés affichés en haut.

Vous pouvez aussi régénérer le changelog manuellement à tout moment :

```bash
scripts/generate-changelog.sh
```

## Tests unitaires

Les tests utilisent le runner de tests intégré de Bun (`bun test`). Les fichiers de test sont dans `src/__tests__/` :

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

Les fichiers de snapshot sont stockés dans `src/__tests__/__snapshots__/` et commités dans git. Lorsque la logique de génération compose ou caddy change, mettez à jour les snapshots avec :

```bash
bun test --update-snapshots
```

## Tests d'intégration

Les tests end-to-end basés sur des VMs se trouvent dans `integration-tests/` et utilisent [nix-vm-test](https://github.com/numtide/nix-vm-test). Des VMs Debian 13 sont lancées via QEMU pour tester les chemins critiques du CLI. Tous les tests utilisent Prowlarr comme app de test.

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

Voir `integration-tests/README.md` pour les détails sur l'exécution locale et l'écriture de nouveaux tests.

## Pipeline CI

Un workflow GitHub Actions s'exécute à chaque push et pull request sur `main` :

1. `bun install`
2. `bun run typecheck`
3. `bun run build`
4. `bun test`
5. Tests d'intégration (matrice parallèle de 6 jobs) : active KVM, installe Nix, exécute chaque test VM avec cache du store Nix

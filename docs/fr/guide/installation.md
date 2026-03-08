# Installation

## Prérequis

Avant d'installer Mithrandir, assurez-vous d'avoir :

- Un serveur Debian ou Ubuntu (y compris Raspberry Pi OS)
- Un accès root ou sudo
- Git installé (`sudo apt install git`)

## Installer

Clonez le dépôt et lancez le script d'installation :

```sh
git clone https://github.com/your-username/homelab.git
cd homelab
sudo bash install.sh
```

Le script d'installation effectue automatiquement les étapes suivantes :

1. Installe les dépendances système (`curl`, `unzip`)
2. Installe [Bun](https://bun.sh) (runtime JavaScript) et crée un lien symbolique dans `/usr/local/bin`
3. Installe les dépendances du projet (`bun install`)
4. Compile le bundle CLI (`bun run build`)
5. Crée la commande globale `mithrandir` dans `/usr/local/bin/mithrandir`

Une fois terminé, vérifiez l'installation :

```sh
mithrandir version
```

::: tip
Si `bun` n'est pas trouvé dans une nouvelle session de terminal, exécutez `source ~/.bashrc` (ou `source ~/.zshrc` pour Zsh) pour recharger votre profil shell.
:::

::: tip
Il est fortement recommandé d'attribuer une adresse IP DHCP statique à votre serveur afin que son adresse IP ne change jamais. Vous pouvez configurer cela dans les paramètres de baux statiques DHCP de l'interface web de votre routeur.
:::

## Complétions shell

Configurez l'auto-complétion pour votre shell :

::: code-group

```sh [Bash]
mithrandir completions bash >> ~/.bashrc
source ~/.bashrc
```

```sh [Zsh]
mithrandir completions zsh >> ~/.zshrc
source ~/.zshrc
```

```sh [Fish]
mithrandir completions fish > ~/.config/fish/completions/mithrandir.fish
```

:::

## Étapes suivantes

Une fois Mithrandir installé, lancez l'[assistant de configuration](./setup) pour configurer votre homelab :

```sh
mithrandir setup
```

## Mise à jour

Pour mettre à jour le CLI vers la dernière version :

```sh
mithrandir self-update
```

Cela récupère les derniers changements depuis git, réinstalle les dépendances et recompile le CLI.

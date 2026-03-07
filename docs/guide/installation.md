# Installation

## Prerequisites

Before installing Mithrandir, make sure you have:

- A Debian or Ubuntu server (including Raspberry Pi OS)
- Root or sudo access
- Git installed (`sudo apt install git`)

## Install

Clone the repository and run the install script:

```sh
git clone https://github.com/your-username/homelab.git
cd homelab
sudo bash install.sh
```

The install script automatically:

1. Installs system dependencies (`curl`, `unzip`)
2. Installs [Bun](https://bun.sh) (JavaScript runtime) and symlinks it into `/usr/local/bin`
3. Installs project dependencies (`bun install`)
4. Builds the CLI bundle (`bun run build`)
5. Creates the global `mithrandir` command at `/usr/local/bin/mithrandir`

Once complete, verify the installation:

```sh
mithrandir version
```

::: tip
If `bun` is not found in a new terminal session, run `source ~/.bashrc` (or `source ~/.zshrc` for Zsh) to reload your shell profile.
:::

::: tip
It is highly recommended to assign a static DHCP IP address to your server so it's IP never changes. You can configure this in the DHCP static leases settings in your router's web interface.
:::

## Shell Completions

Set up tab completion for your shell:

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

## Next Steps

With Mithrandir installed, run the [setup wizard](./setup) to configure your homelab:

```sh
mithrandir setup
```

## Updating

To update the CLI to the latest version:

```sh
mithrandir self-update
```

This pulls the latest changes from git, reinstalls dependencies, and rebuilds the CLI.

# Firewall

Mithrandir can optionally configure [UFW](https://wiki.ubuntu.com/UncomplicatedFirewall) with [ufw-docker](https://github.com/chaifeng/ufw-docker) to control network access to your services.

## Why ufw-docker?

Docker manipulates `iptables` directly, which means standard UFW rules **do not apply** to Docker-published ports. The `ufw-docker` utility solves this by managing rules in the `DOCKER-USER` iptables chain, which Docker respects.

## Install

```sh
sudo mithrandir install firewall
```

This will:

1. Install UFW (if not already installed)
2. Install the [ufw-docker](https://github.com/chaifeng/ufw-docker) utility
3. Enable UFW with a default **deny incoming** policy
4. **Always allow SSH** (port 22) to prevent lockouts
5. Add firewall rules for all currently installed apps

## How It Works

Once the firewall is enabled (`ENABLE_FIREWALL=true` in `.env`), mithrandir automatically manages UFW rules:

- **`mithrandir install <app>`** — adds UFW rules for the app's ports
- **`mithrandir uninstall <app>`** — removes UFW rules for the app's ports
- **`mithrandir install <stack>`** — adds rules for all apps in the stack

### Host-networked vs bridge-networked apps

- **Bridge-networked apps** (most apps): Rules are managed via `ufw-docker allow <container> <port>`, which works with the `DOCKER-USER` iptables chain.
- **Host-networked apps** (Home Assistant, DuckDNS): Rules are managed via standard `ufw allow <port>`, since Docker doesn't manage their iptables entries.

## Setup Wizard

The setup wizard includes a firewall step after app installation. You can choose to enable or skip it. In `--yes` mode, the firewall is installed automatically.

## Checking Status

View current firewall rules:

```sh
sudo ufw status
```

The `mithrandir doctor` command also checks firewall status and reports any issues.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `ENABLE_FIREWALL` | *(not set)* | Set to `true` to enable automatic UFW rule management |

::: warning
The firewall requires the `ufw-docker` third-party utility, which is downloaded from GitHub. It modifies `/etc/ufw/after.rules` to integrate with Docker's iptables chains. If you have custom UFW rules, review the changes after installation.
:::

::: danger
Always ensure SSH access is working before enabling the firewall on a remote server. The installer always allows port 22, but verify you can connect before closing your current session.
:::

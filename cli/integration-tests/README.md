# Mithrandir Integration Tests

VM-based end-to-end tests using [nix-vm-test](https://github.com/numtide/nix-vm-test). Spins up real Debian 13 VMs via QEMU and runs critical CLI workflows.

## Prerequisites

1. **Linux system with Nix installed** — [install Nix](https://zero-to-nix.com/start/install)
2. **KVM acceleration** — required for reasonable performance

```sh
# Check KVM support
LC_ALL=C.UTF-8 lscpu | grep Virtualization
```

> **macOS note**: These tests require a Linux host with KVM. Run them in CI on GitHub Actions Linux runners, or locally inside a Linux VM (e.g. Lima/OrbStack) with KVM passthrough.

## Tests

| Test | Description | Disk |
|------|-------------|------|
| `getting-started` | Clone → `install.sh` → `mithrandir --help` | +4G |
| `docker-install` | `mithrandir install docker` + idempotency check | +6G |
| `app-lifecycle` | Install/status/stop/start/restart/uninstall (Prowlarr) | +6G |
| `backup-restore` | Backup, verify, verify --extract, restore | +8G |
| `diagnostics` | version, config, health, doctor, capacity, status | +6G |
| `update` | `mithrandir update prowlarr --yes` + backup verification | +8G |
| `firewall` | `mithrandir install firewall` (UFW + ufw-docker), per-app rule sync | +6G |

## Running Tests

```sh
cd integration-tests

# Run a specific test
nix build .#checks.x86_64-linux.getting-started -L
nix build .#checks.x86_64-linux.docker-install -L
nix build .#checks.x86_64-linux.app-lifecycle -L
nix build .#checks.x86_64-linux.backup-restore -L
nix build .#checks.x86_64-linux.diagnostics -L
nix build .#checks.x86_64-linux.update -L
nix build .#checks.x86_64-linux.firewall -L

# Run all tests
nix flake check -L

# Interactive mode (opens QEMU window + Python console for debugging)
nix build .#app-lifecycle-interactive -L && ./result/bin/test-driver
```

## CI Integration

Tests run in parallel via a GitHub Actions matrix strategy:

```yaml
integration-test:
  runs-on: ubuntu-latest
  strategy:
    fail-fast: false
    matrix:
      test: [getting-started, docker-install, app-lifecycle, backup-restore, diagnostics, update, firewall]
  steps:
    - uses: actions/checkout@v5
    - name: Enable KVM
      run: |
        echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
        sudo udevadm control --reload-rules
        sudo udevadm trigger --name-match=kvm
    - uses: cachix/install-nix-action@v27
    - name: Run ${{ matrix.test }} test
      working-directory: integration-tests
      run: nix build .#checks.x86_64-linux.${{ matrix.test }} -L
```

# Mithrandir Integration Tests

VM-based end-to-end tests using [nix-vm-test](https://github.com/numtide/nix-vm-test). Spins up a real Debian VM via QEMU and runs the full getting-started flow.

## Prerequisites

1. **Linux system with Nix installed** — [install Nix](https://zero-to-nix.com/start/install)
2. **KVM acceleration** — required for reasonable performance

```sh
# Check KVM support
LC_ALL=C.UTF-8 lscpu | grep Virtualization
```

> **macOS note**: These tests require a Linux host with KVM. Run them in CI on GitHub Actions Linux runners, or locally inside a Linux VM (e.g. Lima/OrbStack) with KVM passthrough.

## Running Tests

```sh
cd integration-tests

# Run the test (non-interactive)
nix build .# -L && ./result/bin/test-driver

# Run interactively (opens QEMU window + Python console for debugging)
nix build .#interactive -L && ./result/bin/test-driver
```

## What It Tests

The **getting-started** test replicates what a real user does:

1. Boot a fresh Debian 13 VM
2. `apt-get install git`
3. `git clone` the mithrandir repo
4. Run `bash install.sh`
5. Verify `mithrandir --help` works and shows expected output

## CI Integration

```yaml
integration-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: cachix/install-nix-action@v27
      with:
        extra_nix_config: |
          experimental-features = nix-command flakes
    - name: Run getting-started test
      working-directory: integration-tests
      run: |
        nix build .# -L
        ./result/bin/test-driver
```

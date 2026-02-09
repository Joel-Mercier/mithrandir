#!/usr/bin/env bash
set -Eeuo pipefail

# Bootstrap script: installs Bun + dependencies on a bare Debian/Ubuntu server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo "[homelab] $*"; }
error() { echo "[homelab] ERROR: $*" >&2; exit 1; }

# Check for Debian/Ubuntu
if [[ -f /etc/os-release ]]; then
  . /etc/os-release
  case "${ID:-}" in
    debian|ubuntu) ;;
    *) error "Unsupported distro: ${ID:-unknown}. Only Debian and Ubuntu are supported." ;;
  esac
else
  error "Cannot detect distro. /etc/os-release not found."
fi

# Install system dependencies
log "Installing system dependencies (curl, unzip)..."
if ! command -v curl &>/dev/null || ! command -v unzip &>/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq curl unzip
fi

# Install Bun
if command -v bun &>/dev/null; then
  log "Bun already installed: $(bun --version)"
else
  log "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  log "Bun installed: $(bun --version)"
fi

# Install Node dependencies
log "Installing dependencies..."
cd "$SCRIPT_DIR"
bun install

log ""
log "Setup complete! Run the CLI with:"
log "  sudo bun run $SCRIPT_DIR/src/index.tsx setup"

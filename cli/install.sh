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

# Determine the user's login shell and its rc file
USER_SHELL="$(basename "${SHELL:-/bin/bash}")"
case "$USER_SHELL" in
  zsh)  SHELL_RC="$HOME/.zshrc" ;;
  bash) SHELL_RC="$HOME/.bashrc" ;;
  *)    SHELL_RC="$HOME/.bashrc" ;;
esac

# Install Bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

if command -v bun &>/dev/null; then
  log "Bun already installed: $(bun --version)"
else
  log "Installing Bun..."
  curl -fsSL https://bun.com/install | bash

  # The installer targets ~/.bashrc by default. If the user's shell is
  # different, ensure their rc file also has the PATH entries.
  if [[ "$SHELL_RC" != "$HOME/.bashrc" ]]; then
    BUN_PATH_LINE='export BUN_INSTALL="$HOME/.bun"'
    if ! grep -qF "$BUN_PATH_LINE" "$SHELL_RC" 2>/dev/null; then
      log "Adding Bun to $SHELL_RC..."
      {
        echo ""
        echo "# bun"
        echo 'export BUN_INSTALL="$HOME/.bun"'
        echo 'export PATH="$BUN_INSTALL/bin:$PATH"'
      } >> "$SHELL_RC"
    fi
  fi

  # Symlink into /usr/local/bin so bun is available under sudo
  # (sudo resets PATH to secure_path which doesn't include ~/.bun/bin)
  log "Symlinking bun into /usr/local/bin..."
  sudo ln -sf "$BUN_INSTALL/bin/bun" /usr/local/bin/bun
  sudo ln -sf "$BUN_INSTALL/bin/bunx" /usr/local/bin/bunx

  log "Bun installed: $(bun --version)"
fi

# Ensure symlinks exist even if bun was already installed
if [[ ! -L /usr/local/bin/bun ]]; then
  log "Symlinking bun into /usr/local/bin..."
  sudo ln -sf "$BUN_INSTALL/bin/bun" /usr/local/bin/bun
  sudo ln -sf "$BUN_INSTALL/bin/bunx" /usr/local/bin/bunx
fi

# Install Node dependencies
log "Installing dependencies..."
cd "$SCRIPT_DIR"
bun install

log ""
log "Setup complete! Run the CLI with:"
log "  sudo bun run $SCRIPT_DIR/src/index.tsx setup"
log ""
log "If 'bun' is not found in a new terminal, run: source $SHELL_RC"

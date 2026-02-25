#!/usr/bin/env bash
set -Eeuo pipefail

# Bootstrap script: installs Bun + dependencies on a bare Debian/Ubuntu server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo "[mithrandir] $*"; }
error() { echo "[mithrandir] ERROR: $*" >&2; exit 1; }

# Detect the real (non-root) user when running under sudo
if [[ "${EUID:-$(id -u)}" -eq 0 ]] && [[ -n "${SUDO_USER:-}" ]]; then
  REAL_USER="$SUDO_USER"
  REAL_HOME="$(getent passwd "$REAL_USER" | cut -d: -f6)"
else
  REAL_USER="$(id -un)"
  REAL_HOME="$HOME"
fi

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

# Determine the real user's login shell and its rc file
USER_SHELL="$(basename "$(getent passwd "$REAL_USER" | cut -d: -f7)" 2>/dev/null || echo "bash")"
case "$USER_SHELL" in
  zsh)  SHELL_RC="$REAL_HOME/.zshrc" ;;
  bash) SHELL_RC="$REAL_HOME/.bashrc" ;;
  *)    SHELL_RC="$REAL_HOME/.bashrc" ;;
esac

# Install Bun — always install to the real user's home, not /root
BUN_INSTALL="$REAL_HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

if command -v bun &>/dev/null; then
  log "Bun already installed: $(bun --version)"
else
  log "Installing Bun..."
  # Run the installer as the real user so it installs to ~realuser/.bun
  curl -fsSL https://bun.com/install | sudo -u "$REAL_USER" BUN_INSTALL="$BUN_INSTALL" bash

  # The installer targets ~/.bashrc by default. If the user's shell is
  # different, ensure their rc file also has the PATH entries.
  if [[ "$SHELL_RC" != "$REAL_HOME/.bashrc" ]]; then
    BUN_PATH_LINE='export BUN_INSTALL="$HOME/.bun"'
    if ! grep -qF "$BUN_PATH_LINE" "$SHELL_RC" 2>/dev/null; then
      log "Adding Bun to $SHELL_RC..."
      sudo -u "$REAL_USER" tee -a "$SHELL_RC" > /dev/null <<'BUNRC'

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
BUNRC
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

# Ensure project dir is writable by the real user
if [[ "$REAL_USER" != "root" ]]; then
  sudo chown -R "$REAL_USER:" "$SCRIPT_DIR"
fi

# Install Node dependencies (as real user)
log "Installing dependencies..."
cd "$SCRIPT_DIR"
sudo -u "$REAL_USER" "$BUN_INSTALL/bin/bun" install

# Build the CLI bundle (as real user)
mkdir -p "$SCRIPT_DIR/dist"
log "Building CLI..."
sudo -u "$REAL_USER" "$BUN_INSTALL/bin/bun" run build

# Install the mithrandir command
log "Installing mithrandir command..."
sudo ln -sf "$SCRIPT_DIR/dist/mithrandir.js" /usr/local/bin/mithrandir

log ""
log "Setup complete! Run the CLI with:"
log "  sudo mithrandir setup"
log ""
log "If 'bun' is not found in a new terminal, run: source $SHELL_RC"

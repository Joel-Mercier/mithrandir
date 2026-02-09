#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# -----------------------------
# Docker Complete Uninstall Script
# Removes Docker, all containers, images, volumes, and networks from a Debian system
# -----------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use sudo)."
    exit 1
fi

echo ""
echo "============================================"
echo "  Docker Complete Uninstall"
echo "============================================"
echo ""
warn "This will permanently remove Docker and ALL associated data:"
echo "  - All running and stopped containers"
echo "  - All images, volumes, and networks"
echo "  - Docker Engine, CLI, containerd, and plugins"
echo "  - All Docker configuration files"
echo ""
read -rp "Are you sure you want to continue? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    info "Uninstall cancelled."
    exit 0
fi

echo ""

# --- Stop Docker services ---
info "Stopping Docker and containerd services..."
if systemctl is-active --quiet docker 2>/dev/null; then
    systemctl stop docker
    info "Docker service stopped."
else
    warn "Docker service is not running."
fi

if systemctl is-active --quiet containerd 2>/dev/null; then
    systemctl stop containerd
    info "containerd service stopped."
else
    warn "containerd service is not running."
fi

# --- Remove all Docker data (containers, images, volumes, networks) ---
if command -v docker &>/dev/null; then
    info "Removing all containers, images, volumes, and networks..."
    docker system prune -a --volumes -f && \
        info "Docker system prune completed." || \
        warn "Docker system prune encountered issues (Docker may already be stopped)."

    # Remove any remaining custom networks
    remaining_networks=$(docker network ls --filter type=custom -q 2>/dev/null || true)
    if [[ -n "$remaining_networks" ]]; then
        info "Removing custom Docker networks..."
        echo "$remaining_networks" | xargs -r docker network rm 2>/dev/null && \
            info "Custom networks removed." || \
            warn "Some networks could not be removed."
    else
        info "No custom Docker networks to remove."
    fi
else
    warn "Docker command not found — skipping container/image/network cleanup."
fi

# --- Purge Docker packages ---
info "Purging Docker packages..."
apt purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null && \
    info "Docker packages purged." || \
    warn "Some Docker packages were not installed or already removed."

info "Running autoremove to clean up unused dependencies..."
apt autoremove -y 2>/dev/null && \
    info "Autoremove completed." || \
    warn "Autoremove encountered issues."

# --- Remove Docker data directories ---
info "Removing Docker data directories..."

for dir in /var/lib/docker /var/lib/containerd /etc/docker; do
    if [[ -d "$dir" ]]; then
        rm -rf "$dir"
        info "Removed $dir"
    else
        warn "$dir does not exist — skipping."
    fi
done

# Remove user-level Docker config for all users with a .docker directory
for user_docker in /home/*/.docker /root/.docker; do
    if [[ -d "$user_docker" ]]; then
        rm -rf "$user_docker"
        info "Removed $user_docker"
    fi
done

# --- Remove Docker APT repository and keyring ---
if [[ -f /etc/apt/sources.list.d/docker.list ]]; then
    rm -f /etc/apt/sources.list.d/docker.list
    info "Removed Docker APT repository."
fi

if [[ -f /etc/apt/keyrings/docker.asc ]]; then
    rm -f /etc/apt/keyrings/docker.asc
    info "Removed Docker GPG keyring."
fi

echo ""
echo "============================================"
info "Docker has been completely uninstalled."
echo "============================================"
echo ""

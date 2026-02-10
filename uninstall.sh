#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# -----------------------------
# Homelab Complete Uninstall Script
# Removes Docker, backup systemd units, rclone, and local backups
# -----------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; }
section() { echo -e "\n${BLUE}--- $1 ---${NC}"; }

BACKUP_DIR="/backups"
SERVICE_NAME="homelab-backup"
LOG_FILE="/var/log/homelab-backup.log"

if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use sudo)."
    exit 1
fi

echo ""
echo "============================================"
echo "  Homelab Complete Uninstall"
echo "============================================"
echo ""
warn "This will permanently remove:"
echo "  - All running and stopped Docker containers"
echo "  - All Docker images, volumes, and networks"
echo "  - Docker Engine, CLI, containerd, and plugins"
echo "  - All Docker configuration files"
echo "  - Backup systemd timer and service (${SERVICE_NAME})"
echo "  - rclone and its configuration"
echo "  - All local backups in ${BACKUP_DIR}"
echo "  - Backup log at ${LOG_FILE}"
echo ""
read -rp "Are you sure you want to continue? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    info "Uninstall cancelled."
    exit 0
fi

# ===========================================
# Step 1: Stop and remove backup systemd units
# ===========================================
section "Step 1/6: Removing backup systemd units"

if systemctl is-active --quiet "${SERVICE_NAME}.timer" 2>/dev/null; then
    systemctl stop "${SERVICE_NAME}.timer"
    info "Stopped ${SERVICE_NAME}.timer."
else
    warn "${SERVICE_NAME}.timer is not running."
fi

if systemctl is-enabled --quiet "${SERVICE_NAME}.timer" 2>/dev/null; then
    systemctl disable "${SERVICE_NAME}.timer"
    info "Disabled ${SERVICE_NAME}.timer."
else
    warn "${SERVICE_NAME}.timer is not enabled."
fi

if systemctl is-active --quiet "${SERVICE_NAME}.service" 2>/dev/null; then
    systemctl stop "${SERVICE_NAME}.service"
    info "Stopped ${SERVICE_NAME}.service."
else
    warn "${SERVICE_NAME}.service is not running."
fi

for unit_file in "/etc/systemd/system/${SERVICE_NAME}.timer" "/etc/systemd/system/${SERVICE_NAME}.service"; do
    if [[ -f "$unit_file" ]]; then
        rm -f "$unit_file"
        info "Removed $unit_file"
    else
        warn "$unit_file does not exist — skipping."
    fi
done

systemctl daemon-reload
info "Systemd daemon reloaded."

if [[ -f "$LOG_FILE" ]]; then
    rm -f "$LOG_FILE"
    info "Removed backup log $LOG_FILE"
fi

# ===========================================
# Step 2: Stop Docker services and clean up
# ===========================================
section "Step 2/6: Stopping Docker services"

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

# ===========================================
# Step 3: Remove Docker data and packages
# ===========================================
section "Step 3/6: Removing Docker containers, images, volumes, and packages"

if command -v docker &>/dev/null; then
    info "Removing all containers, images, volumes, and networks..."
    docker system prune -a --volumes -f && \
        info "Docker system prune completed." || \
        warn "Docker system prune encountered issues (Docker may already be stopped)."

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

info "Purging Docker packages..."
apt purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null && \
    info "Docker packages purged." || \
    warn "Some Docker packages were not installed or already removed."

info "Running autoremove to clean up unused dependencies..."
apt autoremove -y 2>/dev/null && \
    info "Autoremove completed." || \
    warn "Autoremove encountered issues."

info "Removing Docker data directories..."
for dir in /var/lib/docker /var/lib/containerd /etc/docker; do
    if [[ -d "$dir" ]]; then
        rm -rf "$dir"
        info "Removed $dir"
    else
        warn "$dir does not exist — skipping."
    fi
done

for user_docker in /home/*/.docker /root/.docker; do
    if [[ -d "$user_docker" ]]; then
        rm -rf "$user_docker"
        info "Removed $user_docker"
    fi
done

if [[ -f /etc/apt/sources.list.d/docker.list ]]; then
    rm -f /etc/apt/sources.list.d/docker.list
    info "Removed Docker APT repository."
fi

if [[ -f /etc/apt/keyrings/docker.asc ]]; then
    rm -f /etc/apt/keyrings/docker.asc
    info "Removed Docker GPG keyring."
fi

# ===========================================
# Step 4: Uninstall rclone
# ===========================================
section "Step 4/6: Uninstalling rclone"

if command -v rclone &>/dev/null; then
    rclone_bin=$(command -v rclone)
    rm -f "$rclone_bin"
    info "Removed rclone binary ($rclone_bin)."
else
    warn "rclone is not installed — skipping binary removal."
fi

# Remove rclone man page and systemd files if they exist
for rclone_file in /usr/local/share/man/man1/rclone.1 /usr/share/man/man1/rclone.1; do
    if [[ -f "$rclone_file" ]]; then
        rm -f "$rclone_file"
        info "Removed $rclone_file"
    fi
done

# Remove rclone config for all users
for rclone_conf in /home/*/.config/rclone /root/.config/rclone; do
    if [[ -d "$rclone_conf" ]]; then
        rm -rf "$rclone_conf"
        info "Removed rclone config $rclone_conf"
    fi
done

# ===========================================
# Step 5: Delete local backups
# ===========================================
section "Step 5/6: Deleting local backups"

if [[ -d "$BACKUP_DIR" ]]; then
    rm -rf "$BACKUP_DIR"
    info "Removed all local backups in $BACKUP_DIR"
else
    warn "$BACKUP_DIR does not exist — skipping."
fi

# ===========================================
# Step 6: Remove app data directories
# ===========================================
section "Step 6/6: Removing app data directories"

# Determine the default base dir (invoking user's home, even when run via sudo)
if [[ -n "${SUDO_USER:-}" ]]; then
    default_base_dir=$(getent passwd "$SUDO_USER" | cut -d: -f6)
else
    default_base_dir="$HOME"
fi

echo ""
warn "This will delete all app data directories (bazarr, sonarr, jellyfin, etc.)."
echo "  Hidden files/directories (.*) and the 'homelab' project directory will be kept."
echo ""
read -rp "Enter the base directory used for the install [${default_base_dir}]: " base_dir
base_dir="${base_dir:-$default_base_dir}"

if [[ ! -d "$base_dir" ]]; then
    warn "$base_dir does not exist — skipping app data removal."
else
    # Show what will be deleted
    info "The following directories in $base_dir will be deleted:"
    found_dirs=$(find "$base_dir" -mindepth 1 -maxdepth 1 -type d \
        ! -name '.*' \
        ! -name 'homelab' \
        2>/dev/null || true)

    if [[ -z "$found_dirs" ]]; then
        info "No app data directories found — nothing to remove."
    else
        echo "$found_dirs" | while read -r d; do
            echo "  $(basename "$d")"
        done

        echo ""
        read -rp "Delete these directories? (y/N): " confirm_apps
        if [[ "$confirm_apps" =~ ^[Yy]$ ]]; then
            find "$base_dir" -mindepth 1 -maxdepth 1 -type d \
                ! -name '.*' \
                ! -name 'homelab' \
                -exec rm -rf {} +
            info "All app data directories in $base_dir have been removed."
        else
            info "Skipped app data removal."
        fi
    fi
fi

# ===========================================
# Done
# ===========================================
echo ""
echo "============================================"
info "Homelab has been completely uninstalled."
echo "============================================"
echo ""

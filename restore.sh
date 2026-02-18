#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# -----------------------------
# Configuration
# -----------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/backup.conf"
LOG_FILE="/var/log/homelab-restore.log"

# Ensure log file exists and is writable
if [ ! -f "$LOG_FILE" ]; then
    sudo touch "$LOG_FILE"
    sudo chown "$(id -un):$(id -gn)" "$LOG_FILE"
elif [ ! -w "$LOG_FILE" ]; then
    sudo chown "$(id -un):$(id -gn)" "$LOG_FILE"
fi

# -----------------------------
# Utility functions
# -----------------------------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    log "ERROR: $*" >&2
    exit 1
}

warn() {
    log "WARNING: $*" >&2
}

load_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        error "Configuration file not found: $CONFIG_FILE"
    fi

    # Source the config file
    # shellcheck source=/dev/null
    source "$CONFIG_FILE"

    # Set defaults if not specified
    BACKUP_DIR="${BACKUP_DIR:-/backups}"
    RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"

    # Try to get BASE_DIR from .env if not set in backup.conf
    if [ -z "${BASE_DIR:-}" ]; then
        local env_file="${SCRIPT_DIR}/.env"
        if [ -f "$env_file" ]; then
            # Extract BASE_DIR from .env file
            BASE_DIR=$(grep "^BASE_DIR=" "$env_file" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
            if [ -z "$BASE_DIR" ]; then
                error "BASE_DIR not found in backup.conf or .env file"
            fi
            log "Using BASE_DIR from .env: $BASE_DIR"
        else
            error "BASE_DIR not set in backup.conf and .env file not found"
        fi
    fi

    # Expand BASE_DIR to full path
    BASE_DIR=$(realpath -m "$BASE_DIR")
}

# App mapping: maps app name to its directory structure
get_app_config() {
    local app_name="$1"
    case "$app_name" in
        homeassistant)
            echo "$BASE_DIR/homeassistant:data:docker-compose.yml"
            ;;
        qbittorrent)
            echo "$BASE_DIR/qbittorrent:config:docker-compose.yml"
            ;;
        prowlarr)
            echo "$BASE_DIR/prowlarr:config:docker-compose.yml"
            ;;
        radarr)
            echo "$BASE_DIR/radarr:config:docker-compose.yml"
            ;;
        sonarr)
            echo "$BASE_DIR/sonarr:config:docker-compose.yml"
            ;;
        bazarr)
            echo "$BASE_DIR/bazarr:config:docker-compose.yml"
            ;;
        lidarr)
            echo "$BASE_DIR/lidarr:config:docker-compose.yml"
            ;;
        seerr)
            echo "$BASE_DIR/seerr:app/config:docker-compose.yml"
            ;;
        homarr)
            echo "$BASE_DIR/homarr:multiple:docker-compose.yml"
            ;;
        jellyfin)
            echo "$BASE_DIR/jellyfin:config:docker-compose.yml"
            ;;
        navidrome)
            echo "$BASE_DIR/navidrome:data:docker-compose.yml"
            ;;
        duckdns)
            echo "$BASE_DIR/duckdns:config:docker-compose.yml"
            ;;
        wireguard)
            echo "$BASE_DIR/wireguard:config:docker-compose.yml"
            ;;
        uptime-kuma)
            echo "$BASE_DIR/uptime-kuma:data:docker-compose.yml"
            ;;
        *)
            return 1
            ;;
    esac
}

# Get container name from app name
get_container_name() {
    local app_name="$1"
    case "$app_name" in
        uptime-kuma)
            echo "uptime-kuma"
            ;;
        *)
            echo "$app_name"
            ;;
    esac
}

# Find backup file (local or remote)
find_backup() {
    local app_name="$1"
    local archive_date="$2"
    local backup_file

    # Try local first
    if [ "$archive_date" = "latest" ]; then
        backup_file="${BACKUP_DIR}/latest/${app_name}.tar.zst"
        if [ -L "$backup_file" ] || [ -f "$backup_file" ]; then
            # Resolve symlink to actual file
            backup_file=$(readlink -f "$backup_file" 2>/dev/null || echo "$backup_file")
            if [ -f "$backup_file" ]; then
                echo "$backup_file"
                return 0
            fi
        fi
    else
        backup_file="${BACKUP_DIR}/archive/${archive_date}/${app_name}.tar.zst"
        if [ -f "$backup_file" ]; then
            echo "$backup_file"
            return 0
        fi
    fi

    # Try remote
    if command -v rclone >/dev/null 2>&1; then
        if rclone listremotes | grep -q "^${RCLONE_REMOTE}:"; then
            local remote_path
            if [ "$archive_date" = "latest" ]; then
                # Find the most recent archive on remote
                remote_path=$(rclone lsd "${RCLONE_REMOTE}:/backups/archive/" 2>/dev/null | \
                    awk '/[0-9]{4}-[0-9]{2}-[0-9]{2}/ {print $NF}' | sort -r | head -n 1)
                if [ -z "$remote_path" ]; then
                    return 1
                fi
                archive_date="$remote_path"
            fi

            remote_path="${RCLONE_REMOTE}:/backups/archive/${archive_date}/${app_name}.tar.zst"
            if rclone lsf "$remote_path" >/dev/null 2>&1; then
                # Download to a dedicated temp directory to avoid collisions
                local temp_dir
                temp_dir=$(mktemp -d)
                log "Downloading backup from Google Drive..."
                if rclone copy "$remote_path" "$temp_dir" --no-traverse 2>/dev/null; then
                    local downloaded_file="${temp_dir}/${app_name}.tar.zst"
                    if [ -f "$downloaded_file" ]; then
                        echo "$downloaded_file"
                        return 0
                    fi
                fi
                rm -rf "$temp_dir"
            fi
        fi
    fi

    return 1
}

# Stop container if running
stop_container() {
    local container_name="$1"
    if sudo docker ps -q -f "name=^${container_name}$" | grep -q .; then
        log "Stopping container: $container_name"
        sudo docker stop "$container_name" >/dev/null 2>&1 || {
            warn "Failed to stop container: $container_name"
            return 1
        }
        log "Container stopped: $container_name"
    else
        log "Container not running: $container_name"
    fi
}

# Start container using docker compose
start_container() {
    local app_dir="$1"
    local compose_file="$2"
    local compose_path="${app_dir}/${compose_file}"

    if [ ! -f "$compose_path" ]; then
        error "docker-compose.yml not found at $compose_path"
    fi

    log "Starting container with docker compose..."
    sudo docker compose -f "$compose_path" up -d >/dev/null 2>&1 || {
        error "Failed to start container"
    }

    log "Container started successfully"
}

# Restore a single app
restore_app() {
    local app_name="$1"
    local archive_date="${2:-latest}"
    local skip_confirmation="${3:-false}"

    log "=== Restoring $app_name from $archive_date ==="

    # Find backup file
    local backup_file
    backup_file=$(find_backup "$app_name" "$archive_date") || true
    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        warn "Backup not found for $app_name from $archive_date"
        return 1
    fi

    log "Found backup: $backup_file"

    # Get app configuration
    local app_config
    app_config=$(get_app_config "$app_name") || true
    if [ -z "$app_config" ]; then
        warn "Unknown app: $app_name"
        return 1
    fi

    local app_dir
    local config_subdir
    local compose_file
    IFS=':' read -r app_dir config_subdir compose_file <<< "$app_config"

    # Confirmation prompt
    if [ "$skip_confirmation" != "true" ]; then
        echo
        echo "This will:"
        echo "  1. Stop the $app_name container"
        echo "  2. Delete the current config directory"
        echo "  3. Restore from backup: $backup_file"
        echo "  4. Start the container"
        echo
        read -rp "Continue? [y/N]: " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            log "Restore cancelled by user"
            return 0
        fi
    fi

    # Get container name
    local container_name
    container_name=$(get_container_name "$app_name")

    # Stop container
    stop_container "$container_name"

    # Remove config directory (these are typically root-owned by Docker)
    if [ "$config_subdir" = "multiple" ]; then
        # Special handling for homarr
        log "Removing config directories for $app_name..."
        [ -d "${app_dir}/configs" ] && sudo rm -rf "${app_dir}/configs"
        [ -d "${app_dir}/icons" ] && sudo rm -rf "${app_dir}/icons"
        [ -d "${app_dir}/data" ] && sudo rm -rf "${app_dir}/data"
    else
        local config_path="${app_dir}/${config_subdir}"
        log "Removing config directory: $config_path"
        [ -d "$config_path" ] && sudo rm -rf "$config_path"
    fi

    # Extract backup (use sudo since target dirs may be root-owned)
    log "Extracting backup..."
    if sudo tar --zstd -xf "$backup_file" -C "$BASE_DIR" 2>/dev/null; then
        log "Backup extracted successfully"
    else
        warn "Failed to extract backup for $app_name"
        return 1
    fi

    # Clean up temp dir if backup was downloaded from remote
    if [[ "$backup_file" == /tmp/* ]]; then
        rm -rf "$(dirname "$backup_file")"
    fi

    # Start container
    local compose_path="${app_dir}/${compose_file}"
    if [ ! -f "$compose_path" ]; then
        warn "docker-compose.yml not found at $compose_path after restore"
        return 1
    fi
    log "Starting container with docker compose..."
    sudo docker compose -f "$compose_path" up -d >/dev/null 2>&1 || {
        warn "Failed to start container for $app_name"
        return 1
    }
    log "Container started successfully"

    log "=== Successfully restored $app_name ==="
}

# Restore secrets (.env and setup.sh)
restore_secrets() {
    local archive_date="${1:-latest}"
    local skip_confirmation="${2:-false}"

    log "=== Restoring secrets from $archive_date ==="

    # Find backup file
    local backup_file
    backup_file=$(find_backup "secrets" "$archive_date")
    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        error "Secrets backup not found from $archive_date"
    fi

    log "Found backup: $backup_file"

    # Confirmation prompt
    if [ "$skip_confirmation" != "true" ]; then
        echo
        echo "This will restore .env and setup.sh from: $backup_file"
        echo "Existing files will be overwritten!"
        echo
        read -rp "Continue? [y/N]: " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi

    # Extract to script directory
    log "Extracting secrets..."
    if tar --zstd -xf "$backup_file" -C "$SCRIPT_DIR" 2>/dev/null; then
        log "Secrets restored successfully"
    else
        error "Failed to extract secrets backup"
    fi

    # Clean up temp dir if backup was downloaded from remote
    if [[ "$backup_file" == /tmp/* ]]; then
        rm -rf "$(dirname "$backup_file")"
    fi

    log "=== Successfully restored secrets ==="
}

# Restore all apps
restore_full() {
    local archive_date="${1:-latest}"
    local skip_confirmation="${2:-false}"

    log "=== Starting full restore from $archive_date ==="

    # Restore secrets first
    restore_secrets "$archive_date" "$skip_confirmation" || true

    # Detect which apps have backups available (without downloading)
    local known_apps=("homeassistant" "qbittorrent" "prowlarr" "radarr" "sonarr" "bazarr" "lidarr"
                      "seerr" "homarr" "jellyfin" "navidrome" "duckdns" "wireguard" "uptime-kuma")

    # Resolve "latest" to an actual date for remote lookups
    local resolved_date="$archive_date"
    if [ "$archive_date" = "latest" ]; then
        # Check local latest symlinks first
        if [ -d "${BACKUP_DIR}/latest" ]; then
            local any_latest
            any_latest=$(ls "${BACKUP_DIR}/latest/"*.tar.zst 2>/dev/null | head -n 1 || true)
            if [ -n "$any_latest" ]; then
                resolved_date="latest"
            fi
        fi
    fi

    local apps_to_restore=()
    for app in "${known_apps[@]}"; do
        local found=false
        # Check local
        if [ "$resolved_date" = "latest" ]; then
            local lf="${BACKUP_DIR}/latest/${app}.tar.zst"
            if [ -L "$lf" ] || [ -f "$lf" ]; then
                found=true
            fi
        else
            local af="${BACKUP_DIR}/archive/${resolved_date}/${app}.tar.zst"
            if [ -f "$af" ]; then
                found=true
            fi
        fi
        # Check remote only if not found locally
        if [ "$found" = false ] && command -v rclone >/dev/null 2>&1; then
            if rclone listremotes 2>/dev/null | grep -q "^${RCLONE_REMOTE}:"; then
                local check_date="$archive_date"
                if [ "$check_date" = "latest" ]; then
                    check_date=$(rclone lsd "${RCLONE_REMOTE}:/backups/archive/" 2>/dev/null | \
                        awk '/[0-9]{4}-[0-9]{2}-[0-9]{2}/ {print $NF}' | sort -r | head -n 1)
                fi
                if [ -n "$check_date" ]; then
                    if rclone lsf "${RCLONE_REMOTE}:/backups/archive/${check_date}/${app}.tar.zst" >/dev/null 2>&1; then
                        found=true
                    fi
                fi
            fi
        fi
        if [ "$found" = true ]; then
            apps_to_restore+=("$app")
        fi
    done

    if [ ${#apps_to_restore[@]} -eq 0 ]; then
        warn "No apps found to restore from $archive_date"
        exit 0
    fi

    log "Found ${#apps_to_restore[@]} app(s) to restore: ${apps_to_restore[*]}"

    # Confirmation prompt
    if [ "$skip_confirmation" != "true" ]; then
        echo
        echo "This will restore all apps from $archive_date:"
        echo "  ${apps_to_restore[*]}"
        echo
        echo "Each app will be stopped, config deleted, and restored."
        echo
        read -rp "Continue? [y/N]: " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi

    # Restore each app
    local failed_apps=()
    for app in "${apps_to_restore[@]}"; do
        if ! restore_app "$app" "$archive_date" "true"; then
            failed_apps+=("$app")
        fi
    done

    log "=== Full restore complete ==="
    if [ ${#failed_apps[@]} -gt 0 ]; then
        warn "Some apps failed to restore: ${failed_apps[*]}"
        exit 1
    else
        log "All apps restored successfully"
        exit 0
    fi
}

# Show usage
show_usage() {
    cat << EOF
Usage: $0 <app_name|full> [date] [--yes]

Restore a backup for a specific app or full setup.

Arguments:
  app_name      Name of the app to restore (e.g., jellyfin, radarr, sonarr)
  full          Restore all apps and secrets
  date          Date of backup in YYYY-MM-DD format (default: latest)
  --yes         Skip confirmation prompts

Examples:
  $0 jellyfin                    # Restore jellyfin from latest backup
  $0 jellyfin 2025-01-01        # Restore jellyfin from specific date
  $0 full                        # Restore all apps from latest backup
  $0 full 2025-01-01            # Restore all apps from specific date
  $0 jellyfin 2025-01-01 --yes  # Restore without confirmation

Available apps:
  homeassistant, qbittorrent, prowlarr, radarr, sonarr, bazarr, lidarr,
  seerr, homarr, jellyfin, navidrome, duckdns, wireguard, uptime-kuma
EOF
}

# -----------------------------
# Main
# -----------------------------
main() {
    local app_name="${1:-}"
    local archive_date="${2:-latest}"
    local skip_confirmation="false"

    # Parse --yes flag
    for arg in "$@"; do
        if [ "$arg" = "--yes" ]; then
            skip_confirmation="true"
        fi
    done

    # Remove --yes from date if it was passed as date
    if [ "$archive_date" = "--yes" ]; then
        archive_date="latest"
    fi

    # Validate date format if provided
    if [ "$archive_date" != "latest" ]; then
        if [[ ! "$archive_date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
            error "Invalid date format. Use YYYY-MM-DD or 'latest'"
        fi
    fi

    if [ -z "$app_name" ]; then
        show_usage
        exit 1
    fi

    # Load configuration
    load_config

    # Check if root/sudo is available
    if ! sudo -n true 2>/dev/null; then
        error "This script requires sudo access. Please run with sudo or configure passwordless sudo."
    fi

    # Restore based on app_name
    if [ "$app_name" = "full" ]; then
        restore_full "$archive_date" "$skip_confirmation"
    else
        restore_app "$app_name" "$archive_date" "$skip_confirmation"
    fi
}

# Run main function
main "$@"

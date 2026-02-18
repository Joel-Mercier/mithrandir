#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# -----------------------------
# Configuration
# -----------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/backup.conf"
LOG_FILE="/var/log/homelab-backup.log"

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
    LOCAL_RETENTION="${LOCAL_RETENTION:-5}"
    REMOTE_RETENTION="${REMOTE_RETENTION:-10}"
    RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"
    APPS="${APPS:-auto}"

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

    # Create backup directories with proper ownership
    if [ ! -d "$BACKUP_DIR" ]; then
        sudo mkdir -p "$BACKUP_DIR/latest" "$BACKUP_DIR/archive"
        sudo chown -R "$(id -un):$(id -gn)" "$BACKUP_DIR"
    else
        mkdir -p "$BACKUP_DIR/latest" "$BACKUP_DIR/archive" 2>/dev/null || {
            sudo mkdir -p "$BACKUP_DIR/latest" "$BACKUP_DIR/archive"
            sudo chown -R "$(id -un):$(id -gn)" "$BACKUP_DIR"
        }
    fi
}

# App mapping: maps app name to its directory structure
# Format: "app_name:directory_path:compose_file_path"
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

# Detect installed apps by checking for docker-compose.yml files
detect_apps() {
    local apps=()
    local known_apps=("homeassistant" "qbittorrent" "prowlarr" "radarr" "sonarr" "bazarr" "lidarr" 
                      "seerr" "homarr" "jellyfin" "navidrome" "duckdns" "wireguard" "uptime-kuma")

    for app in "${known_apps[@]}"; do
        local app_config
        app_config=$(get_app_config "$app")
        if [ -z "$app_config" ]; then
            continue
        fi

        local app_dir
        local config_subdir
        local compose_file
        IFS=':' read -r app_dir config_subdir compose_file <<< "$app_config"

        # Check if docker-compose.yml exists and config directory exists
        local compose_path="${app_dir}/${compose_file}"
        if [ "$config_subdir" = "multiple" ]; then
            # Special handling for homarr (multiple directories)
            if [ -f "$compose_path" ] && [ -d "${app_dir}/configs" ]; then
                apps+=("$app")
            fi
        else
            local config_path="${app_dir}/${config_subdir}"
            if [ -f "$compose_path" ] && [ -d "$config_path" ]; then
                apps+=("$app")
            fi
        fi
    done

    printf '%s\n' "${apps[@]}"
}

# Backup a single app
backup_app() {
    local app_name="$1"
    local archive_date="$2"
    local archive_dir="${BACKUP_DIR}/archive/${archive_date}"
    local backup_file="${archive_dir}/${app_name}.tar.zst"

    log "Backing up $app_name..."

    local app_config
    app_config=$(get_app_config "$app_name")
    if [ -z "$app_config" ]; then
        warn "Unknown app: $app_name, skipping"
        return 1
    fi

    local app_dir
    local config_subdir
    local compose_file
    IFS=':' read -r app_dir config_subdir compose_file <<< "$app_config"

    # Special handling for homarr (multiple directories)
    if [ "$config_subdir" = "multiple" ]; then
        local compose_path="${app_dir}/${compose_file}"
        if [ ! -f "$compose_path" ]; then
            warn "docker-compose.yml not found for $app_name at $compose_path, skipping"
            return 1
        fi

        # Create tarball with multiple directories
        local app_basename
        app_basename=$(basename "$app_dir")
        sudo tar --zstd -cf "$backup_file" -C "$BASE_DIR" \
            "${app_basename}/configs" \
            "${app_basename}/icons" \
            "${app_basename}/data" \
            "${app_basename}/${compose_file}" 2>/dev/null || {
            warn "Failed to create backup for $app_name"
            return 1
        }
        sudo chown "$(id -un):$(id -gn)" "$backup_file"
    else
        local config_path="${app_dir}/${config_subdir}"
        local compose_path="${app_dir}/${compose_file}"

        if [ ! -d "$config_path" ]; then
            warn "Config directory not found for $app_name at $config_path, skipping"
            return 1
        fi

        if [ ! -f "$compose_path" ]; then
            warn "docker-compose.yml not found for $app_name at $compose_path, skipping"
            return 1
        fi

        # Create tarball
        local app_basename
        app_basename=$(basename "$app_dir")
        sudo tar --zstd -cf "$backup_file" -C "$BASE_DIR" \
            "${app_basename}/${config_subdir}" \
            "${app_basename}/${compose_file}" 2>/dev/null || {
            warn "Failed to create backup for $app_name"
            return 1
        }
        sudo chown "$(id -un):$(id -gn)" "$backup_file"
    fi

    # Update latest symlink
    ln -sf "${archive_dir}/${app_name}.tar.zst" "${BACKUP_DIR}/latest/${app_name}.tar.zst"

    log "Successfully backed up $app_name to $backup_file"
}

# Backup secrets (.env and setup.sh)
backup_secrets() {
    local archive_date="$1"
    local archive_dir="${BACKUP_DIR}/archive/${archive_date}"
    local backup_file="${archive_dir}/secrets.tar.zst"

    log "Backing up secrets..."

    local secrets=()
    [ -f "${SCRIPT_DIR}/.env" ] && secrets+=(".env")
    [ -f "${SCRIPT_DIR}/setup.sh" ] && secrets+=("setup.sh")
    [ -f "${SCRIPT_DIR}/backup.sh" ] && secrets+=("backup.sh")
    [ -f "${SCRIPT_DIR}/restore.sh" ] && secrets+=("restore.sh")
    [ -f "${SCRIPT_DIR}/backup.conf" ] && secrets+=("backup.conf")

    if [ ${#secrets[@]} -eq 0 ]; then
        warn "No secrets found to backup"
        return 1
    fi

    # Get relative paths for tar
    local tar_files=()
    for secret in "${secrets[@]}"; do
        local basename_secret
        basename_secret=$(basename "$secret")
        tar_files+=("$basename_secret")
    done

    tar --zstd -cf "$backup_file" -C "$SCRIPT_DIR" "${tar_files[@]}" 2>/dev/null || {
        warn "Failed to create secrets backup"
        return 1
    }

    # Update latest symlink
    ln -sf "$backup_file" "${BACKUP_DIR}/latest/secrets.tar.zst"

    log "Successfully backed up secrets to $backup_file"
}

# Rotate local backups
rotate_local_backups() {
    log "Rotating local backups (keeping $LOCAL_RETENTION most recent)..."

    # Get list of archive directories sorted by date (oldest first)
    local archive_dirs
    archive_dirs=$(find "${BACKUP_DIR}/archive" -mindepth 1 -maxdepth 1 -type d | sort)

    local count
    count=$(echo "$archive_dirs" | wc -l)

    if [ "$count" -le "$LOCAL_RETENTION" ]; then
        log "Only $count backup(s) found, no rotation needed"
        return 0
    fi

    local to_delete
    to_delete=$((count - LOCAL_RETENTION))

    log "Deleting $to_delete oldest backup(s)..."
    echo "$archive_dirs" | head -n "$to_delete" | while read -r dir; do
        log "Deleting old backup: $dir"
        rm -rf "$dir" 2>/dev/null || sudo rm -rf "$dir"
    done

    log "Local backup rotation complete"
}

# Upload to Google Drive via rclone
upload_to_remote() {
    local archive_date="$1"
    local archive_dir="${BACKUP_DIR}/archive/${archive_date}"

    if ! command -v rclone >/dev/null 2>&1; then
        warn "rclone not found, skipping remote upload"
        return 1
    fi

    # Check if rclone remote exists
    if ! rclone listremotes | grep -q "^${RCLONE_REMOTE}:"; then
        warn "rclone remote '$RCLONE_REMOTE' not found, skipping remote upload"
        warn "Configure rclone with: rclone config"
        return 1
    fi

    log "Uploading backup to Google Drive (remote: $RCLONE_REMOTE)..."

    # Upload the entire archive directory
    rclone copy "$archive_dir" "${RCLONE_REMOTE}:/backups/archive/${archive_date}" \
        --log-file="$LOG_FILE" --log-level INFO || {
        warn "Failed to upload backup to Google Drive"
        return 1
    }

    log "Successfully uploaded backup to Google Drive"
}

# Rotate remote backups on Google Drive
rotate_remote_backups() {
    if ! command -v rclone >/dev/null 2>&1; then
        warn "rclone not found, skipping remote rotation"
        return 1
    fi

    # Check if rclone remote exists
    if ! rclone listremotes | grep -q "^${RCLONE_REMOTE}:"; then
        warn "rclone remote '$RCLONE_REMOTE' not found, skipping remote rotation"
        return 1
    fi

    log "Rotating remote backups (keeping $REMOTE_RETENTION most recent)..."

    # List all archive directories on remote
    local remote_dirs
    remote_dirs=$(rclone lsd "${RCLONE_REMOTE}:/backups/archive/" 2>/dev/null | \
        awk '/[0-9]{4}-[0-9]{2}-[0-9]{2}/ {print $NF}' | sort) || {
        warn "Failed to list remote backups"
        return 1
    }

    local count
    count=$(echo "$remote_dirs" | wc -l)

    if [ "$count" -le "$REMOTE_RETENTION" ]; then
        log "Only $count remote backup(s) found, no rotation needed"
        return 0
    fi

    local to_delete
    to_delete=$((count - REMOTE_RETENTION))

    log "Deleting $to_delete oldest remote backup(s)..."
    echo "$remote_dirs" | head -n "$to_delete" | while read -r dir; do
        log "Deleting old remote backup: $dir"
        rclone purge "${RCLONE_REMOTE}:/backups/archive/${dir}" 2>/dev/null || {
            warn "Failed to delete remote backup: $dir"
        }
    done

    log "Remote backup rotation complete"
}

# Delete local backups
delete_local_backups() {
    local date="${1:-}"

    if [ -n "$date" ]; then
        local archive_path="${BACKUP_DIR}/archive/${date}"
        if [ ! -d "$archive_path" ]; then
            error "Local backup not found for date: ${date}"
        fi
        log "Deleting local backup for ${date}..."
        rm -rf "$archive_path" 2>/dev/null || sudo rm -rf "$archive_path"
        log "Deleted local backup: ${date}"
    else
        local archive_dirs
        archive_dirs=$(find "${BACKUP_DIR}/archive" -mindepth 1 -maxdepth 1 -type d -name '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' | sort)
        if [ -z "$archive_dirs" ]; then
            log "No local backups found"
            return 0
        fi
        log "Deleting all local backups..."
        echo "$archive_dirs" | while read -r dir; do
            local dirname
            dirname=$(basename "$dir")
            rm -rf "$dir" 2>/dev/null || sudo rm -rf "$dir"
            log "Deleted local backup: ${dirname}"
        done
        # Clear latest symlinks
        rm -rf "${BACKUP_DIR}/latest" 2>/dev/null || sudo rm -rf "${BACKUP_DIR}/latest"
        mkdir -p "${BACKUP_DIR}/latest" 2>/dev/null || sudo mkdir -p "${BACKUP_DIR}/latest"
        log "All local backups deleted"
    fi
}

# Delete remote backups
delete_remote_backups() {
    local date="${1:-}"

    if ! command -v rclone >/dev/null 2>&1; then
        error "rclone is not installed"
    fi

    if ! rclone listremotes | grep -q "^${RCLONE_REMOTE}:"; then
        error "rclone remote '${RCLONE_REMOTE}' not configured"
    fi

    if [ -n "$date" ]; then
        log "Deleting remote backup for ${date}..."
        rclone purge "${RCLONE_REMOTE}:/backups/archive/${date}" 2>/dev/null || {
            error "Failed to delete remote backup: ${date}"
        }
        log "Deleted remote backup: ${date}"
    else
        local remote_dirs
        remote_dirs=$(rclone lsd "${RCLONE_REMOTE}:/backups/archive/" 2>/dev/null | \
            awk '/[0-9]{4}-[0-9]{2}-[0-9]{2}/ {print $NF}' | sort) || {
            error "Failed to list remote backups"
        }
        if [ -z "$remote_dirs" ]; then
            log "No remote backups found"
            return 0
        fi
        log "Deleting all remote backups..."
        echo "$remote_dirs" | while read -r dir; do
            rclone purge "${RCLONE_REMOTE}:/backups/archive/${dir}" 2>/dev/null || {
                warn "Failed to delete remote backup: ${dir}"
            }
            log "Deleted remote backup: ${dir}"
        done
        log "All remote backups deleted"
    fi
}

# -----------------------------
# Main
# -----------------------------
main() {
    # Handle delete subcommand
    if [ "${1:-}" = "delete" ]; then
        local target="${2:-}"
        local date="${3:-}"

        if [ "$target" != "local" ] && [ "$target" != "remote" ]; then
            echo "Usage: bash backup.sh delete <local|remote> [YYYY-MM-DD]"
            echo ""
            echo 'Specify "local" or "remote" as the target.'
            exit 1
        fi

        if [ -n "$date" ] && ! [[ "$date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
            echo "Invalid date format: ${date}"
            echo "Expected: YYYY-MM-DD"
            exit 1
        fi

        load_config

        if [ "$target" = "local" ]; then
            delete_local_backups "$date"
        else
            delete_remote_backups "$date"
        fi
        exit 0
    fi

    log "=== Starting backup process ==="

    # Load configuration
    load_config

    # Get archive date
    local archive_date
    archive_date=$(date '+%Y-%m-%d')
    local archive_dir="${BACKUP_DIR}/archive/${archive_date}"
    mkdir -p "$archive_dir"

    # Determine which apps to backup
    local apps_to_backup
    if [ "$APPS" = "auto" ]; then
        log "Auto-detecting installed apps..."
        readarray -t apps_to_backup < <(detect_apps)
        if [ ${#apps_to_backup[@]} -eq 0 ]; then
            warn "No apps detected, nothing to backup"
            exit 0
        fi
        log "Detected apps: ${apps_to_backup[*]}"
    else
        readarray -t apps_to_backup < <(printf '%s\n' $APPS)
        log "Using configured apps: ${apps_to_backup[*]}"
    fi

    # Backup each app
    local failed_apps=()
    for app in "${apps_to_backup[@]}"; do
        if ! backup_app "$app" "$archive_date"; then
            failed_apps+=("$app")
        fi
    done

    # Backup secrets
    backup_secrets "$archive_date" || true

    # Rotate local backups
    rotate_local_backups

    # Upload to remote
    upload_to_remote "$archive_date" || true

    # Rotate remote backups
    rotate_remote_backups || true

    # Summary
    log "=== Backup process complete ==="
    if [ ${#failed_apps[@]} -gt 0 ]; then
        warn "Some apps failed to backup: ${failed_apps[*]}"
        exit 1
    else
        log "All apps backed up successfully"
        exit 0
    fi
}

# Run main function
main "$@"

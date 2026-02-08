#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# -----------------------------
# Utility functions
# -----------------------------
load_env() {
    local script_dir="${1:-.}"
    local env_file="$script_dir/.env"
    if [ -f "$env_file" ]; then
        echo "Loading environment variables from .env file..."
        set -a
        source "$env_file"
        set +a
        echo "Environment variables loaded from .env"
    else
        echo "No .env file found. Using defaults and prompts."
    fi
}

run() {
    sudo bash -c "$1"
}

container_running() {
    local name="$1"
    local cid
    cid=$(sudo docker ps -qf "name=^${name}$" 2>/dev/null || true)
    [[ -n "$cid" ]]
}

get_running_image_id() {
    sudo docker inspect --format='{{.Image}}' "$1" 2>/dev/null
}

get_latest_image_id() {
    local image="$1"
    sudo docker pull "$image" >/dev/null
    sudo docker image inspect --format='{{.Id}}' "$image"
}

prompt_yes_no() {
    $AUTO_YES && return 0
    local prompt="$1"
    read -rp "$prompt [Y/n]: " RESP
    [[ -z "$RESP" || "$RESP" =~ ^[Yy]$ ]]
}

prompt_update_if_needed() {
    local name="$1"
    local image="$2"
    local dir="$3"

    local CURRENT_ID
    local LATEST_ID
    CURRENT_ID=$(get_running_image_id "$name")
    LATEST_ID=$(get_latest_image_id "$image")

    if [ "$CURRENT_ID" != "$LATEST_ID" ]; then
        echo
        echo "Update available for $name"
        echo "Current image ID: $CURRENT_ID"
        echo "Latest  image ID: $LATEST_ID"

        if prompt_yes_no "Update $name now?"; then
            run "cd \"$dir\" && docker compose pull && docker compose down && docker compose up -d"
            CID=$(sudo docker ps -qf "name=^${name}$")
            echo "UPDATED: $name running with container ID: $CID"
        else
            echo "SKIPPED: $name update skipped."
        fi
    fi
}

start_compose() {
    local dir="$1"
    local name="$2"

    run "cd \"$dir\" && docker compose up -d"
    local CID
    CID=$(sudo docker ps -qf "name=^${name}$")

    if [ -n "$CID" ]; then
        echo "SUCCESS: $name started with container ID: $CID"
    else
        echo "WARNING: $name did not report a running container."
    fi
}

prompt_base_dir() {
    if [ -n "${BASE_DIR:-}" ]; then
        echo "Using base directory from .env: $BASE_DIR"
        BASE_DIR=$(realpath -m "$BASE_DIR")
        run "mkdir -p \"$BASE_DIR\""
        return
    fi

    DEFAULT_DIR="$HOME"
    read -rp "Enter the base directory where all Docker app folders should be created [$DEFAULT_DIR]: " BASE_DIR

    if [ -z "$BASE_DIR" ]; then
        BASE_DIR="$DEFAULT_DIR"
    fi

    BASE_DIR=$(realpath -m "$BASE_DIR")
    run "mkdir -p \"$BASE_DIR\""
    echo "Using base directory: $BASE_DIR"
}

describe_app() {
    echo
    echo "---------------------------------------------"
    echo "$1"
    echo "$2"
    echo "---------------------------------------------"
    echo
}

print_url() {
    local label="$1"
    local port="$2"
    echo "- $label: http://$LOCAL_IP:$port"
}

detect_linux_distro() {
    if [ ! -f /etc/os-release ]; then
        echo "ERROR: Cannot detect Linux distribution (missing /etc/os-release)"
        exit 1
    fi

    . /etc/os-release

    case "$ID" in
        debian)
            LINUX_DISTRO="debian"
            ;;
        ubuntu)
            LINUX_DISTRO="ubuntu"
            ;;
        *)
            echo "ERROR: Unsupported Linux distribution: $ID"
            echo "This script supports Debian and Ubuntu only."
            exit 1
            ;;
    esac

    export LINUX_DISTRO
    echo "Detected Linux distribution: $LINUX_DISTRO"
}

has_systemd() {
    [ -d /run/systemd/system ] && command -v systemctl >/dev/null 2>&1
}

is_wsl() {
    grep -qi microsoft /proc/version 2>/dev/null
}

# -----------------------------
# Install selection flags
# -----------------------------
INSTALL_HOMEASSISTANT=false
INSTALL_QBITTORRENT=false
INSTALL_PROWLARR=false
INSTALL_RADARR=false
INSTALL_SONARR=false
INSTALL_BAZARR=false
INSTALL_LIDARR=false
INSTALL_JELLYSEERR=false
INSTALL_HOMARR=false
INSTALL_JELLYFIN=false
INSTALL_NAVIDROME=false
INSTALL_DUCKDNS=false
INSTALL_WIREGUARD=false
INSTALL_KUMA=false

# -----------------------------
# Docker installation
# -----------------------------
install_docker() {
    echo "Starting Docker installation"
    if command -v docker >/dev/null 2>&1; then
        echo "Docker already installed. Skipping installation."
        return
    fi

    detect_linux_distro

    DOCKER_GPG_URL="https://download.docker.com/linux/${LINUX_DISTRO}/gpg"
    DOCKER_APT_URI="https://download.docker.com/linux/${LINUX_DISTRO}"

    run "apt update"
    run "apt install -y ca-certificates curl"
    run "install -m 0755 -d /etc/apt/keyrings"
    run "curl -fsSL $DOCKER_GPG_URL -o /etc/apt/keyrings/docker.asc"
    run "chmod a+r /etc/apt/keyrings/docker.asc"

    run "tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: $DOCKER_APT_URI
Suites: \$(. /etc/os-release && echo \"\$VERSION_CODENAME\")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF"

    run "apt update"
    run "apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin"

    if has_systemd; then
        echo "systemd detected – enabling and starting Docker services"
        run "systemctl enable docker"
        run "systemctl enable containerd"
        run "systemctl start containerd"
        run "systemctl start docker"
    else
        if is_wsl; then
        echo "WSL detected – starting Docker daemon in foreground-compatible mode"
        else
            echo "systemd not detected – starting Docker daemon manually"
        fi

        if ! pgrep -x dockerd >/dev/null 2>&1; then
            run "dockerd > /var/log/dockerd.log 2>&1 &"
        fi
    fi

    echo "Waiting for Docker daemon to become available..."

    DOCKER_READY=false
    for i in {1..30}; do
        if sudo docker info >/dev/null 2>&1; then
            DOCKER_READY=true
            break
        fi
        sleep 1
    done

    if [ "$DOCKER_READY" = true ]; then
        echo "Docker daemon is running."
    else
        echo "ERROR: Docker daemon did not become ready in time."
        exit 1
    fi
    echo "Docker installation completed for $LINUX_DISTRO"
}

# -----------------------------
# rclone installation
# -----------------------------
install_rclone() {
    echo "Starting rclone installation"
    if command -v rclone >/dev/null 2>&1; then
        local rclone_version
        rclone_version=$(rclone version | head -n 1)
        echo "rclone already installed: $rclone_version"
        return
    fi

    detect_linux_distro

    echo "Installing rclone..."
    
    run "apt update"
    run "apt install -y curl unzip"
    
    run "curl https://rclone.org/install.sh | bash"
    
    if command -v rclone >/dev/null 2>&1; then
        local rclone_version
        rclone_version=$(rclone version | head -n 1)
        echo "rclone installation completed: $rclone_version"
        echo ""
        echo "NOTE: To configure rclone for Google Drive, run: rclone config"
        echo "      This will set up the remote connection to your Google Drive."
    else
        echo "ERROR: rclone installation may have failed. Please install manually."
        exit 1
    fi
}

# -----------------------------
# Backup systemd service setup
# -----------------------------
setup_backup_service() {
    echo "Setting up backup systemd service"
    
    if ! has_systemd; then
        echo "systemd not detected. Skipping backup service setup."
        echo "You can manually set up backups using cron or another scheduler."
        return
    fi

    local backup_script="${SCRIPT_DIR}/backup.sh"

    # Check if backup script exists
    if [ ! -f "$backup_script" ]; then
        echo "WARNING: backup.sh not found. Skipping backup service setup."
        return
    fi

    echo "Generating backup service files..."

    # Generate service file with correct path
    local temp_service_file
    temp_service_file=$(mktemp)
    cat > "$temp_service_file" <<EOF
[Unit]
Description=Home Lab Backup Service
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=root
WorkingDirectory=/root
ExecStart=/usr/bin/bash ${backup_script}
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Generate timer file
    local temp_timer_file
    temp_timer_file=$(mktemp)
    cat > "$temp_timer_file" <<EOF
[Unit]
Description=Daily Home Lab Backup Timer
Requires=homelab-backup.service

[Timer]
# Run at 2:00 AM every day
OnCalendar=*-*-* 02:00:00
# If the system was off, run immediately when it comes back on
Persistent=true
# Randomize start time by 0-30 minutes to avoid load spikes
RandomizedDelaySec=1800

[Install]
WantedBy=timers.target
EOF

    # Copy generated files to systemd directory
    echo "Installing backup service files..."
    run "cp $temp_service_file /etc/systemd/system/homelab-backup.service"
    run "cp $temp_timer_file /etc/systemd/system/homelab-backup.timer"

    # Clean up temp files
    rm -f "$temp_service_file" "$temp_timer_file"

    # Reload systemd daemon
    run "systemctl daemon-reload"

    # Enable and start the timer
    if systemctl is-enabled homelab-backup.timer >/dev/null 2>&1; then
        echo "Backup timer already enabled."
    else
        echo "Enabling backup timer..."
        run "systemctl enable homelab-backup.timer"
    fi

    if systemctl is-active homelab-backup.timer >/dev/null 2>&1; then
        echo "Backup timer already running."
    else
        echo "Starting backup timer..."
        run "systemctl start homelab-backup.timer"
    fi

    echo "Backup service installed and enabled."
    echo "  Timer status: $(systemctl is-active homelab-backup.timer)"
    
    # Show next run time if available
    local next_run
    next_run=$(systemctl list-timers homelab-backup.timer --no-pager 2>/dev/null | tail -n 1 | awk '{print $1, $2, $3, $4}' || echo "N/A")
    if [ -n "$next_run" ] && [ "$next_run" != "N/A" ]; then
        echo "  Next run: $next_run"
    else
        echo "  Next run: Scheduled for daily at 2:00 AM"
    fi
    echo ""
}

# -----------------------------
# Main
# -----------------------------
echo "============================================="
echo " Starting Raspberry Pi setup"
echo "============================================="

trap 'echo "ERROR: Script failed at line $LINENO while running: $BASH_COMMAND"; exit 1' ERR

# Get script directory for .env file location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables from .env file
load_env "$SCRIPT_DIR"

# Set AUTO_YES from .env or command line argument
AUTO_YES="${AUTO_YES:-false}"
if [[ "${1:-}" == "--yes" ]]; then
  AUTO_YES=true
fi

install_docker
install_rclone
prompt_base_dir

# -----------------------------
# Home Assistant
# -----------------------------
describe_app "Home Assistant" \
"Home automation platform for controlling smart devices, sensors, and integrations."
if prompt_yes_no "Install / manage Home Assistant?"; then
    INSTALL_HOMEASSISTANT=true
    HA_IMAGE="lscr.io/linuxserver/homeassistant:latest"
    HA_DIR="$BASE_DIR/homeassistant"

    if container_running "homeassistant"; then
        prompt_update_if_needed "homeassistant" "$HA_IMAGE" "$HA_DIR"
    else
        run "mkdir -p \"$HA_DIR/data\""
        run "cat > \"$HA_DIR/docker-compose.yml\" <<EOF
services:
  homeassistant:
    image: $HA_IMAGE
    container_name: homeassistant
    network_mode: host
    environment:
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - TZ=${TZ:-Etc/UTC}
    volumes:
      - $HA_DIR/data:/config
    restart: unless-stopped
EOF"
        start_compose "$HA_DIR" "homeassistant"
    fi
fi

# -----------------------------
# Shared data root (ARR stack)
# -----------------------------
DATA_DIR="$BASE_DIR/data"

run "mkdir -p \
    \"$DATA_DIR\" \
    \"$DATA_DIR/downloads/movies\" \
    \"$DATA_DIR/downloads/tv\" \
    \"$DATA_DIR/downloads/music\" \
    \"$DATA_DIR/media/movies\" \
    \"$DATA_DIR/media/tv\" \
    \"$DATA_DIR/media/music\""

if [ "$(stat -c %d "$DATA_DIR/downloads")" != "$(stat -c %d "$DATA_DIR/media")" ]; then
    echo "ERROR: downloads and media are on different devices. Hardlinks will not work."
    exit 1
fi

# -----------------------------
# qBittorrent
# -----------------------------
describe_app "qBittorrent" \
"BitTorrent client used by Radarr, Sonarr, and Lidarr for automated downloads."
if prompt_yes_no "Install / manage qBittorrent?"; then
    INSTALL_QBITTORRENT=true
    QBIT_IMAGE="lscr.io/linuxserver/qbittorrent:latest"
    QBIT_DIR="$BASE_DIR/qbittorrent"
    DATA_DIR="$BASE_DIR/data"

    if container_running "qbittorrent"; then
        prompt_update_if_needed "qbittorrent" "$QBIT_IMAGE" "$QBIT_DIR"
    else
        run "mkdir -p \
            \"$QBIT_DIR/config\" \
            \"$DATA_DIR/downloads/movies\" \
            \"$DATA_DIR/downloads/tv\" \
            \"$DATA_DIR/downloads/music\""

        run "cat > \"$QBIT_DIR/docker-compose.yml\" <<EOF
services:
  qbittorrent:
    image: $QBIT_IMAGE
    container_name: qbittorrent
    environment:
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - TZ=${TZ:-Etc/UTC}
      - WEBUI_PORT=8080
    volumes:
      - $QBIT_DIR/config:/config
      - $DATA_DIR:/data
    ports:
      - 8080:8080
      - 6881:6881
      - 6881:6881/udp
    restart: unless-stopped
EOF"
        start_compose "$QBIT_DIR" "qbittorrent"
    fi
fi


# -----------------------------
# Prowlarr
# -----------------------------
describe_app "Prowlarr" \
"Indexer manager that centralizes torrent and Usenet indexers for *Arr applications."
if prompt_yes_no "Install / manage Prowlarr?"; then
    INSTALL_PROWLARR=true
    PROWLARR_IMAGE="lscr.io/linuxserver/prowlarr:latest"
    PROWLARR_DIR="$BASE_DIR/prowlarr"

    if container_running "prowlarr"; then
        prompt_update_if_needed "prowlarr" "$PROWLARR_IMAGE" "$PROWLARR_DIR"
    else
        run "mkdir -p \"$PROWLARR_DIR/config\""
        run "cat > \"$PROWLARR_DIR/docker-compose.yml\" <<EOF
services:
  prowlarr:
    image: $PROWLARR_IMAGE
    container_name: prowlarr
    environment:
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - TZ=${TZ:-Etc/UTC}
    volumes:
      - $PROWLARR_DIR/config:/config
    ports:
      - 9696:9696
    restart: unless-stopped
EOF"
        start_compose "$PROWLARR_DIR" "prowlarr"
    fi
fi

# -----------------------------
# Radarr
# -----------------------------
describe_app "Radarr" \
"Movie collection manager that automates searching, downloading, and organizing films."
if prompt_yes_no "Install / manage Radarr?"; then
    INSTALL_RADARR=true
    RADARR_IMAGE="lscr.io/linuxserver/radarr:latest"
    RADARR_DIR="$BASE_DIR/radarr"
    DATA_DIR="$BASE_DIR/data"

    if container_running "radarr"; then
        prompt_update_if_needed "radarr" "$RADARR_IMAGE" "$RADARR_DIR"
    else
        run "mkdir -p \
            \"$RADARR_DIR/config\" \
            \"$DATA_DIR/media/movies\""

        run "cat > \"$RADARR_DIR/docker-compose.yml\" <<EOF
services:
  radarr:
    image: $RADARR_IMAGE
    container_name: radarr
    environment:
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - TZ=${TZ:-Etc/UTC}
    volumes:
      - $RADARR_DIR/config:/config
      - $DATA_DIR:/data
    ports:
      - 7878:7878
    restart: unless-stopped
EOF"
        start_compose "$RADARR_DIR" "radarr"
    fi
fi


# -----------------------------
# Sonarr
# -----------------------------
describe_app "Sonarr" \
"TV series manager that automates episode downloads and library organization."
if prompt_yes_no "Install / manage Sonarr?"; then
    INSTALL_SONARR=true
    SONARR_IMAGE="lscr.io/linuxserver/sonarr:latest"
    SONARR_DIR="$BASE_DIR/sonarr"
    DATA_DIR="$BASE_DIR/data"

    if container_running "sonarr"; then
        prompt_update_if_needed "sonarr" "$SONARR_IMAGE" "$SONARR_DIR"
    else
        run "mkdir -p \
            \"$SONARR_DIR/config\" \
            \"$DATA_DIR/media/tv\""

        run "cat > \"$SONARR_DIR/docker-compose.yml\" <<EOF
services:
  sonarr:
    image: $SONARR_IMAGE
    container_name: sonarr
    environment:
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - TZ=${TZ:-Etc/UTC}
    volumes:
      - $SONARR_DIR/config:/config
      - $DATA_DIR:/data
    ports:
      - 8989:8989
    restart: unless-stopped
EOF"
        start_compose "$SONARR_DIR" "sonarr"
    fi
fi

# -----------------------------
# Bazarr
# -----------------------------
describe_app "Bazarr" \
"Subtitle manager for movies and TV shows, integrates with Radarr and Sonarr."
if prompt_yes_no "Install / manage Bazarr?"; then
    INSTALL_BAZARR=true
    BAZARR_IMAGE="lscr.io/linuxserver/bazarr:latest"
    BAZARR_DIR="$BASE_DIR/bazarr"
    DATA_DIR="$BASE_DIR/data"

    if container_running "bazarr"; then
        prompt_update_if_needed "bazarr" "$BAZARR_IMAGE" "$BAZARR_DIR"
    else
        run "mkdir -p \"$BAZARR_DIR/config\" \"$DATA_DIR/media/movies\" \"$DATA_DIR/media/tv\""
        run "cat > \"$BAZARR_DIR/docker-compose.yml\" <<EOF
services:
  bazarr:
    image: $BAZARR_IMAGE
    container_name: bazarr
    environment:
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - TZ=${TZ:-Etc/UTC}
    volumes:
      - $BAZARR_DIR/config:/config
      - $DATA_DIR:/data
    ports:
      - 6767:6767
    restart: unless-stopped
EOF"
        start_compose "$BAZARR_DIR" "bazarr"
    fi
fi

# -----------------------------
# Lidarr
# -----------------------------
describe_app "Lidarr" \
"Music collection manager that automates downloads and tagging of audio libraries."
if prompt_yes_no "Install / manage Lidarr?"; then
    INSTALL_LIDARR=true
    LIDARR_IMAGE="lscr.io/linuxserver/lidarr:latest"
    LIDARR_DIR="$BASE_DIR/lidarr"
    DATA_DIR="$BASE_DIR/data"

    if container_running "lidarr"; then
        prompt_update_if_needed "lidarr" "$LIDARR_IMAGE" "$LIDARR_DIR"
    else
        run "mkdir -p \"$LIDARR_DIR/config\" \"$DATA_DIR/media/music\""
        run "cat > \"$LIDARR_DIR/docker-compose.yml\" <<EOF
services:
  lidarr:
    image: $LIDARR_IMAGE
    container_name: lidarr
    environment:
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - TZ=${TZ:-Etc/UTC}
    volumes:
      - $LIDARR_DIR/config:/config
      - $DATA_DIR:/data
    ports:
      - 8686:8686
    restart: unless-stopped
EOF"
        start_compose "$LIDARR_DIR" "lidarr"
    fi
fi

# -----------------------------
# Jellyseerr
# -----------------------------
describe_app "Jellyseerr" \
"Request management system for Jellyfin that lets users request movies and TV shows."

if prompt_yes_no "Install / manage Jellyseerr?"; then
    INSTALL_JELLYSEERR=true
    JELLYSEERR_IMAGE="ghcr.io/fallenbagel/jellyseerr:latest"
    JELLYSEERR_DIR="$BASE_DIR/jellyseerr"

    if container_running "jellyseerr"; then
        prompt_update_if_needed "jellyseerr" "$JELLYSEERR_IMAGE" "$JELLYSEERR_DIR"
    else
        run "mkdir -p \"$JELLYSEERR_DIR/app/config\""
        run "cat > \"$JELLYSEERR_DIR/docker-compose.yml\" <<EOF
services:
  jellyseerr:
    image: $JELLYSEERR_IMAGE
    init: true
    container_name: jellyseerr
    environment:
      - LOG_LEVEL=debug
      - TZ=Etc/UTC
      - PORT=5055
    ports:
      - 5055:5055
    volumes:
      - $JELLYSEERR_DIR/app/config:/app/config
    healthcheck:
      test: wget --no-verbose --tries=1 --spider http://localhost:5055/api/v1/status || exit 1
      start_period: 20s
      timeout: 3s
      interval: 15s
      retries: 3
    restart: unless-stopped
EOF"
        start_compose "$JELLYSEERR_DIR" "jellyseerr"
    fi
fi

# -----------------------------
# Homarr
# -----------------------------
describe_app "Homarr" \
"Self-hosted dashboard to organize and access all your services from one place."
if prompt_yes_no "Install / manage Homarr?"; then
    INSTALL_HOMARR=true
    HOMARR_IMAGE="ghcr.io/ajnart/homarr:latest"
    HOMARR_DIR="$BASE_DIR/homarr"

    if container_running "homarr"; then
        prompt_update_if_needed "homarr" "$HOMARR_IMAGE" "$HOMARR_DIR"
    else
        run "mkdir -p \"$HOMARR_DIR/configs\" \"$HOMARR_DIR/icons\" \"$HOMARR_DIR/data\""
        run "cat > \"$HOMARR_DIR/docker-compose.yml\" <<EOF
services:
  homarr:
    image: $HOMARR_IMAGE
    container_name: homarr
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - $HOMARR_DIR/configs:/app/data/configs
      - $HOMARR_DIR/icons:/app/public/icons
      - $HOMARR_DIR/data:/data
    ports:
      - 7575:7575
EOF"
        start_compose "$HOMARR_DIR" "homarr"
    fi
fi

# -----------------------------
# Jellyfin
# -----------------------------
describe_app "Jellyfin" \
"Media server for streaming movies, TV shows, and music to multiple devices."
if prompt_yes_no "Install / manage Jellyfin?"; then
    INSTALL_JELLYFIN=true
    JELLYFIN_IMAGE="lscr.io/linuxserver/jellyfin:latest"
    JELLYFIN_DIR="$BASE_DIR/jellyfin"
    DATA_DIR="$BASE_DIR/data"

    if container_running "jellyfin"; then
        prompt_update_if_needed "jellyfin" "$JELLYFIN_IMAGE" "$JELLYFIN_DIR"
    else
        run "mkdir -p \"$JELLYFIN_DIR/config\""

        run "cat > \"$JELLYFIN_DIR/docker-compose.yml\" <<EOF
services:
  jellyfin:
    image: $JELLYFIN_IMAGE
    container_name: jellyfin
    environment:
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - TZ=${TZ:-Etc/UTC}
    volumes:
      - $JELLYFIN_DIR/config:/config
      - $DATA_DIR:/data:ro
    ports:
      - 8096:8096
      - 8920:8920
      - 7359:7359/udp
      - 1900:1900/udp
    restart: unless-stopped
EOF"
        start_compose "$JELLYFIN_DIR" "jellyfin"
    fi
fi

# -----------------------------
# Navidrome
# -----------------------------
describe_app "Navidrome" \
"Self-hosted music streaming server compatible with Subsonic clients."
if prompt_yes_no "Install / manage Navidrome?"; then
    INSTALL_NAVIDROME=true
    NAVIDROME_IMAGE="deluan/navidrome:latest"
    NAVIDROME_DIR="$BASE_DIR/navidrome"

    if container_running "navidrome"; then
        prompt_update_if_needed "navidrome" "$NAVIDROME_IMAGE" "$NAVIDROME_DIR"
    else
        if [ -z "${ND_SPOTIFY_ID:-}" ]; then
            read -rp "Enter ND_SPOTIFY_ID: " ND_SPOTIFY_ID
        else
            echo "Using ND_SPOTIFY_ID from .env"
        fi
        if [ -z "${ND_SPOTIFY_SECRET:-}" ]; then
            read -rsp "Enter ND_SPOTIFY_SECRET: " ND_SPOTIFY_SECRET
            echo
        else
            echo "Using ND_SPOTIFY_SECRET from .env"
        fi

        run "mkdir -p \"$NAVIDROME_DIR/data\""
        run "cat > \"$NAVIDROME_DIR/docker-compose.yml\" <<EOF
services:
  navidrome:
    image: $NAVIDROME_IMAGE
    container_name: navidrome
    user: ${PUID:-1000}:${PGID:-1000}
    ports:
      - 4533:4533
    restart: unless-stopped
    environment:
      ND_LOGLEVEL: debug
      ND_SPOTIFY_ID: $ND_SPOTIFY_ID
      ND_SPOTIFY_SECRET: $ND_SPOTIFY_SECRET
    volumes:
      - $NAVIDROME_DIR/data:/data
      - $DATA_DIR/media/music:/music:ro
EOF"
        start_compose "$NAVIDROME_DIR" "navidrome"
    fi
fi

# -----------------------------
# DuckDNS
# -----------------------------
describe_app "DuckDNS" \
"Dynamic DNS updater that keeps a domain pointing to your home server IP."
if prompt_yes_no "Install / manage DuckDNS?"; then
    INSTALL_DUCKDNS=true
    DUCKDNS_IMAGE="lscr.io/linuxserver/duckdns:latest"
    DUCKDNS_DIR="$BASE_DIR/duckdns"

    if container_running "duckdns"; then
        prompt_update_if_needed "duckdns" "$DUCKDNS_IMAGE" "$DUCKDNS_DIR"
    else
        if [ -z "${DUCKDNS_SUBDOMAINS:-}" ]; then
            read -rp "Enter DuckDNS subdomain(s) (comma-separated): " DUCKDNS_SUBDOMAINS
        else
            echo "Using DUCKDNS_SUBDOMAINS from .env"
        fi
        if [ -z "${DUCKDNS_TOKEN:-}" ]; then
            read -rsp "Enter DuckDNS token: " DUCKDNS_TOKEN
            echo
        else
            echo "Using DUCKDNS_TOKEN from .env"
        fi

        run "mkdir -p \"$DUCKDNS_DIR/config\""
        run "cat > \"$DUCKDNS_DIR/docker-compose.yml\" <<EOF
services:
  duckdns:
    image: $DUCKDNS_IMAGE
    container_name: duckdns
    network_mode: host
    environment:
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - TZ=${TZ:-Etc/UTC}
      - SUBDOMAINS=$DUCKDNS_SUBDOMAINS
      - TOKEN=$DUCKDNS_TOKEN
      - UPDATE_IP=ipv4
      - LOG_FILE=false
    volumes:
      - $DUCKDNS_DIR/config:/config
    restart: unless-stopped
EOF"
        start_compose "$DUCKDNS_DIR" "duckdns"
    fi
fi

# -----------------------------
# WireGuard
# -----------------------------
describe_app "WireGuard VPN" \
"Fast, secure VPN server for remote access to your home network."
if prompt_yes_no "Install / manage WireGuard VPN?"; then
    INSTALL_WIREGUARD=true
    WIREGUARD_IMAGE="lscr.io/linuxserver/wireguard:latest"
    WIREGUARD_DIR="$BASE_DIR/wireguard"

    if container_running "wireguard"; then
        prompt_update_if_needed "wireguard" "$WIREGUARD_IMAGE" "$WIREGUARD_DIR"
    else
        echo
        echo "WireGuard configuration:"
        echo "SERVERURL : Public DNS name or IP clients will use to reach this server"
        echo "            (e.g. subdomain.duckdns.org or your public IP)"
        echo "PEERS     : Number of client devices allowed to connect (one config per device)"
        echo

        if [ -z "${WG_SERVERURL:-}" ]; then
            read -rp "Enter SERVERURL: " WG_SERVERURL
        else
            echo "Using WG_SERVERURL from .env: $WG_SERVERURL"
        fi
        if [ -z "${WG_PEERS:-}" ]; then
            read -rp "Enter number of PEERS (devices): " WG_PEERS
        else
            echo "Using WG_PEERS from .env: $WG_PEERS"
        fi

        run "mkdir -p \"$WIREGUARD_DIR/config\" \"$WIREGUARD_DIR/lib/modules\""
        run "cat > \"$WIREGUARD_DIR/docker-compose.yml\" <<EOF
services:
  wireguard:
    image: $WIREGUARD_IMAGE
    container_name: wireguard
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    environment:
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - TZ=${TZ:-Etc/UTC}
      - SERVERURL=$WG_SERVERURL
      - SERVERPORT=51820
      - PEERS=$WG_PEERS
      - PEERDNS=auto
      - INTERNAL_SUBNET=10.13.13.0
      - LOG_CONFS=true
    volumes:
      - $WIREGUARD_DIR/config:/config
      - $WIREGUARD_DIR/lib/modules:/lib/modules
    ports:
      - 51820:51820/udp
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
    restart: unless-stopped
EOF"
        start_compose "$WIREGUARD_DIR" "wireguard"

        echo
        echo "Attempting to display QR code for peer1..."
        echo

        if sudo docker exec wireguard test -f /config/peer1/peer1.conf; then
            sudo docker exec wireguard /bin/bash -c 'qrencode -t ansiutf8 < /config/peer1/peer1.conf'
            echo
            echo "QR code displayed above (peer1)."
            echo "PNG file location:"
            echo "  $WIREGUARD_DIR/config/peer1/peer1.png"
        else
            echo "WireGuard peer1 configuration not found yet."
            echo "If this is the first run, wait ~30 seconds and re-run:"
            echo "  sudo docker exec wireguard /bin/bash -c 'qrencode -t ansiutf8 < /config/peer1/peer1.conf'"
        fi
    fi
fi

# -----------------------------
# Uptime Kuma
# -----------------------------
describe_app "Uptime Kuma" \
"Self-hosted monitoring tool to track service availability and uptime."
if prompt_yes_no "Install / manage Uptime Kuma?"; then
    INSTALL_KUMA=true
    KUMA_IMAGE="louislam/uptime-kuma:2"
    KUMA_DIR="$BASE_DIR/uptime-kuma"

    if container_running "uptime-kuma"; then
        prompt_update_if_needed "uptime-kuma" "$KUMA_IMAGE" "$KUMA_DIR"
    else
        run "mkdir -p \"$KUMA_DIR/data\""
        run "cat > \"$KUMA_DIR/docker-compose.yml\" <<EOF
services:
  uptime-kuma:
    image: $KUMA_IMAGE
    container_name: uptime-kuma
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - $KUMA_DIR/data:/app/data
    ports:
      - 3001:3001
    restart: always
EOF"
        start_compose "$KUMA_DIR" "uptime-kuma"
    fi
fi

echo
echo "All selected applications have been processed successfully."

echo "Skipped applications:"
$INSTALL_HOMEASSISTANT || echo "- Home Assistant"
$INSTALL_QBITTORRENT || echo "- qBittorrent"
$INSTALL_PROWLARR || echo "- Prowlarr"
$INSTALL_RADARR || echo "- Radarr"
$INSTALL_SONARR || echo "- Sonarr"
$INSTALL_BAZARR || echo "- Bazarr"
$INSTALL_LIDARR || echo "- Lidarr"
$INSTALL_JELLYSEERR || echo "- Jellyseerr"
$INSTALL_HOMARR || echo "- Homarr"
$INSTALL_JELLYFIN || echo "- Jellyfin"
$INSTALL_NAVIDROME || echo "- Navidrome"
$INSTALL_DUCKDNS || echo "- DuckDNS"
$INSTALL_WIREGUARD || echo "- WireGuard"
$INSTALL_KUMA || echo "- Uptime Kuma"

setup_backup_service

echo
echo "============================================="
echo " Service Access Summary"
echo "============================================="
echo

if [ -z "${LOCAL_IP:-}" ]; then
    LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')
fi

if [ -z "$LOCAL_IP" ]; then
    echo "Unable to detect local network IP."
    exit 0
fi

echo "Detected local network IP: $LOCAL_IP"
echo

$INSTALL_HOMEASSISTANT && print_url "Home Assistant" 8123
$INSTALL_QBITTORRENT   && print_url "qBittorrent" 8080
$INSTALL_PROWLARR     && print_url "Prowlarr" 9696
$INSTALL_RADARR       && print_url "Radarr" 7878
$INSTALL_SONARR       && print_url "Sonarr" 8989
$INSTALL_BAZARR       && print_url "Bazarr" 6767
$INSTALL_LIDARR       && print_url "Lidarr" 8686
$INSTALL_JELLYSEERR   && print_url "Jellyseerr" 5055
$INSTALL_HOMARR       && print_url "Homarr" 7575
$INSTALL_JELLYFIN     && print_url "Jellyfin" 8096
$INSTALL_NAVIDROME    && print_url "Navidrome" 4533
$INSTALL_KUMA         && print_url "Uptime Kuma" 3001

if $INSTALL_DUCKDNS; then
    echo "- DuckDNS: Background service (no web interface)"
fi

if $INSTALL_WIREGUARD; then
    echo "- WireGuard: VPN service active on UDP port 51820"
fi

echo

if $INSTALL_WIREGUARD; then
    echo "WireGuard note:"
    echo "  Official mobile apps are available for Android and iOS. Copy the QR code shown during Wireguard installation to connect with the mobile app."
    echo
fi

echo

if $INSTALL_JELLYFIN; then
    echo "Jellyfin note:"
    echo "  Official apps are available for:"
    echo "   - Android / iOS"
    echo "   - Android TV"
    echo "   - Apple TV"
    echo "   - Smart TVs (Samsung, LG)"
    echo
fi

echo

if $INSTALL_JELLYFIN && $INSTALL_JELLYSEERR; then
    echo "Jellyseerr & Jellyfin note:"
    echo "  Wholphin is an app that allows for media playback from Jellyfin and media discovery and request from Jellyseerr. You can use it instead of the official Jellyfin app."
fi

echo

echo "============================================="
echo " Setup complete"
echo "============================================="

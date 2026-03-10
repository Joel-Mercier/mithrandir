{
  description = "Mithrandir integration tests — VM-based end-to-end testing";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    nix-vm-test = {
      url = "github:numtide/nix-vm-test";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, nix-vm-test }:
    let
      system = "x86_64-linux";

      mkTest = nix-vm-test.lib.${system}.debian."13";

      # Shared bootstrap snippet: clone → install.sh → .env → optionally Docker
      # Usage: interpolate ${bootstrap} then optionally ${installDocker} in testScript
      bootstrap = ''
        vm.wait_for_unit("multi-user.target")

        # Install git
        vm.succeed("apt-get update -qq && apt-get install -y -qq git")

        # Clone the repo
        vm.succeed("git clone https://github.com/Joel-Mercier/mithrandir.git /root/homelab")

        # Run the install script (installs bun + builds CLI)
        vm.succeed("cd /root/homelab && bash install.sh")

        # Create .env
        vm.succeed("""cat > /root/homelab/.env << 'ENVEOF'
BASE_DIR=/opt/homelab
BACKUP_DIR=/backups
PUID=0
PGID=0
TZ=Etc/UTC
APPS=auto
ENVEOF""")
      '';

      installDocker = ''
        # Install Docker via the CLI
        vm.succeed("mithrandir install docker", timeout=300)
        vm.succeed("docker info")
      '';

      # ---------------------------------------------------------------
      # Test: getting-started — git clone → install.sh → mithrandir --help
      # ---------------------------------------------------------------
      gettingStartedTest = mkTest {
        diskSize = "+4G";
        testScript = ''
          vm.wait_for_unit("multi-user.target")

          # Install git (needed to clone the repo)
          vm.succeed("apt-get update -qq && apt-get install -y -qq git")

          # Clone the repo just like a real user would
          vm.succeed("git clone https://github.com/Joel-Mercier/mithrandir.git /root/homelab")

          # Run the install script
          vm.succeed("cd /root/homelab && bash install.sh")

          # Verify mithrandir is installed and responds to --help
          output = vm.succeed("mithrandir --help")
          assert "setup" in output.lower(), f"Expected 'setup' in help output, got: {output}"
        '';
      };

      # ---------------------------------------------------------------
      # Test: docker-install — mithrandir install docker + idempotency
      # ---------------------------------------------------------------
      dockerInstallTest = mkTest {
        diskSize = "+6G";
        testScript = ''
          ${bootstrap}

          # Install Docker via CLI
          vm.succeed("mithrandir install docker", timeout=300)

          # Verify Docker works
          vm.succeed("docker info")
          vm.succeed("docker run --rm hello-world")

          # Idempotency: running install docker again should succeed
          vm.succeed("mithrandir install docker", timeout=300)
          vm.succeed("docker info")
        '';
      };

      # ---------------------------------------------------------------
      # Test: app-lifecycle — install/status/stop/start/restart/uninstall
      # ---------------------------------------------------------------
      appLifecycleTest = mkTest {
        diskSize = "+6G";
        testScript = ''
          ${bootstrap}
          ${installDocker}

          # Install prowlarr
          vm.succeed("mithrandir install prowlarr", timeout=300)

          # Verify container is running
          vm.succeed("docker ps --format '{{.Names}}' | grep -q prowlarr")

          # Verify compose file and config dir exist
          vm.succeed("test -f /opt/homelab/prowlarr/docker-compose.yml")
          vm.succeed("test -d /opt/homelab/prowlarr/config")

          # Verify status shows prowlarr
          output = vm.succeed("mithrandir status")
          assert "prowlarr" in output.lower(), f"Expected 'prowlarr' in status output, got: {output}"

          # Wait for port to be open
          vm.wait_for_open_port(9696)

          # Stop
          vm.succeed("mithrandir stop prowlarr", timeout=120)
          vm.fail("docker ps --format '{{.Names}}' | grep -q prowlarr")

          # Start
          vm.succeed("mithrandir start prowlarr", timeout=120)
          vm.succeed("docker ps --format '{{.Names}}' | grep -q prowlarr")

          # Restart
          vm.succeed("mithrandir restart prowlarr", timeout=120)
          vm.succeed("docker ps --format '{{.Names}}' | grep -q prowlarr")

          # Uninstall
          vm.succeed("mithrandir uninstall prowlarr --yes", timeout=120)
          vm.fail("docker ps -a --format '{{.Names}}' | grep -q prowlarr")
        '';
      };

      # ---------------------------------------------------------------
      # Test: backup-restore — backup, verify, restore
      # ---------------------------------------------------------------
      backupRestoreTest = mkTest {
        diskSize = "+8G";
        testScript = ''
          ${bootstrap}
          ${installDocker}

          # Install prowlarr and let it initialize
          vm.succeed("mithrandir install prowlarr", timeout=300)
          vm.wait_for_open_port(9696)
          vm.succeed("sleep 5")

          # Create backup directory
          vm.succeed("mkdir -p /backups")

          # Run backup (non-TTY path)
          vm.succeed("mithrandir backup", timeout=300)

          # Verify backup archive exists
          vm.succeed("test -f /backups/latest/prowlarr.tar.zst")

          # Verify backup integrity
          vm.succeed("mithrandir backup verify", timeout=120)
          vm.succeed("mithrandir backup verify --extract", timeout=120)

          # Restore
          vm.succeed("mithrandir restore prowlarr --yes", timeout=300)

          # Verify container is running after restore
          vm.succeed("docker ps --format '{{.Names}}' | grep -q prowlarr")
          vm.wait_for_open_port(9696)
        '';
      };

      # ---------------------------------------------------------------
      # Test: diagnostics — version, config, health, doctor, capacity, status
      # ---------------------------------------------------------------
      diagnosticsTest = mkTest {
        diskSize = "+6G";
        testScript = ''
          ${bootstrap}
          ${installDocker}

          # Install prowlarr for status/health checks
          vm.succeed("mithrandir install prowlarr", timeout=300)

          # version
          output = vm.succeed("mithrandir version")
          assert "." in output or "v" in output.lower() or len(output.strip()) > 0, f"Expected version output, got: {output}"

          # config
          output = vm.succeed("mithrandir config")
          assert "BASE_DIR" in output, f"Expected 'BASE_DIR' in config output, got: {output}"

          # health
          output = vm.succeed("mithrandir health")
          assert "docker" in output.lower(), f"Expected 'docker' in health output, got: {output}"

          # doctor
          vm.succeed("mithrandir doctor")

          # capacity
          vm.succeed("mithrandir capacity")

          # status
          output = vm.succeed("mithrandir status")
          assert "prowlarr" in output.lower(), f"Expected 'prowlarr' in status output, got: {output}"
        '';
      };

      # ---------------------------------------------------------------
      # Test: update — mithrandir update prowlarr --yes
      # ---------------------------------------------------------------
      updateTest = mkTest {
        diskSize = "+8G";
        testScript = ''
          ${bootstrap}
          ${installDocker}

          # Create backup dir and install prowlarr
          vm.succeed("mkdir -p /backups")
          vm.succeed("mithrandir install prowlarr", timeout=300)
          vm.wait_for_open_port(9696)
          vm.succeed("sleep 5")

          # Update (exercises backup + pull + restart)
          vm.succeed("mithrandir update prowlarr --yes", timeout=600)

          # Verify container still running
          vm.succeed("docker ps --format '{{.Names}}' | grep -q prowlarr")
          vm.wait_for_open_port(9696)

          # Verify pre-update backup was created
          vm.succeed("test -f /backups/latest/prowlarr.tar.zst")
        '';
      };

    in {
      packages.${system} = {
        default = gettingStartedTest.driver;
        interactive = gettingStartedTest.driverInteractive;
        docker-install = dockerInstallTest.driver;
        docker-install-interactive = dockerInstallTest.driverInteractive;
        app-lifecycle = appLifecycleTest.driver;
        app-lifecycle-interactive = appLifecycleTest.driverInteractive;
        backup-restore = backupRestoreTest.driver;
        backup-restore-interactive = backupRestoreTest.driverInteractive;
        diagnostics = diagnosticsTest.driver;
        diagnostics-interactive = diagnosticsTest.driverInteractive;
        update = updateTest.driver;
        update-interactive = updateTest.driverInteractive;
      };

      checks.${system} = {
        getting-started = gettingStartedTest.driver;
        docker-install = dockerInstallTest.driver;
        app-lifecycle = appLifecycleTest.driver;
        backup-restore = backupRestoreTest.driver;
        diagnostics = diagnosticsTest.driver;
        update = updateTest.driver;
      };
    };
}

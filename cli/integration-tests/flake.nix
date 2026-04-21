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

      # Python helper to run a command as the non-root test user.
      # All mithrandir commands should use as_user() to ensure the CLI
      # exercises its sudo codepaths (backup encryption, docker, etc.).
      asUser = ''
        import shlex
        def as_user(cmd):
            return "su - testuser -c " + shlex.quote(cmd)
      '';

      # Create a non-root user with passwordless sudo
      createUser = ''
        vm.succeed("useradd -m -s /bin/bash testuser")
        vm.succeed("echo 'testuser ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/testuser")
      '';

      # Shared bootstrap snippet: create user → clone → install.sh → .env
      bootstrap = ''
        ${asUser}
        vm.wait_for_unit("multi-user.target")

        ${createUser}

        # Install git
        vm.succeed("apt-get update -qq && apt-get install -y -qq git")

        # Clone the repo as testuser
        vm.succeed(as_user("git clone https://github.com/Joel-Mercier/mithrandir.git /home/testuser/homelab"))

        # Run the install script with sudo (as testuser would in real life)
        vm.succeed(as_user("cd /home/testuser/homelab && sudo bash install.sh"), timeout=300)

        # Create .env (owned by testuser)
        vm.succeed(as_user("""cat > /home/testuser/homelab/.env << 'ENVEOF'
BASE_DIR=/opt/homelab
BACKUP_DIR=/backups
PUID=1000
PGID=1000
TZ=Etc/UTC
APPS=auto
ENVEOF"""))
      '';

      installDocker = ''
        # Install Docker via the CLI (as non-root user with sudo)
        vm.succeed(as_user("mithrandir install docker"), timeout=300)
        vm.succeed("docker info")
      '';

      # ---------------------------------------------------------------
      # Test: getting-started — git clone → install.sh → mithrandir --help
      # ---------------------------------------------------------------
      gettingStartedTest = mkTest {
        diskSize = "+4G";
        testScript = ''
          ${asUser}
          vm.wait_for_unit("multi-user.target")

          ${createUser}

          # Install git (needed to clone the repo)
          vm.succeed("apt-get update -qq && apt-get install -y -qq git")

          # Clone the repo as testuser
          vm.succeed(as_user("git clone https://github.com/Joel-Mercier/mithrandir.git /home/testuser/homelab"))

          # Run the install script with sudo
          vm.succeed(as_user("cd /home/testuser/homelab && sudo bash install.sh"), timeout=300)

          # Verify mithrandir is installed and responds to --help (as non-root)
          output = vm.succeed(as_user("mithrandir --help"))
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

          # Install Docker via CLI (as non-root user)
          vm.succeed(as_user("mithrandir install docker"), timeout=300)

          # Verify Docker works
          vm.succeed("docker info")
          vm.succeed("docker run --rm hello-world")

          # Idempotency: running install docker again should succeed
          vm.succeed(as_user("mithrandir install docker"), timeout=300)
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

          # Install prowlarr (as non-root user)
          vm.succeed(as_user("mithrandir install prowlarr"), timeout=300)

          # Verify container is running
          vm.succeed("docker ps --format '{{.Names}}' | grep -q prowlarr")

          # Verify compose file and config dir exist
          vm.succeed("test -f /opt/homelab/prowlarr/docker-compose.yml")
          vm.succeed("test -d /opt/homelab/prowlarr/config")

          # Verify status shows prowlarr
          output = vm.succeed(as_user("mithrandir status"))
          assert "prowlarr" in output.lower(), f"Expected 'prowlarr' in status output, got: {output}"

          # Wait for port to be open
          vm.wait_for_open_port(9696)

          # Stop
          vm.succeed(as_user("mithrandir stop prowlarr"), timeout=120)
          vm.fail("docker ps --format '{{.Names}}' | grep -q prowlarr")

          # Start
          vm.succeed(as_user("mithrandir start prowlarr"), timeout=120)
          vm.succeed("docker ps --format '{{.Names}}' | grep -q prowlarr")

          # Restart
          vm.succeed(as_user("mithrandir restart prowlarr"), timeout=120)
          vm.succeed("docker ps --format '{{.Names}}' | grep -q prowlarr")

          # Uninstall
          vm.succeed(as_user("mithrandir uninstall prowlarr --yes"), timeout=120)
          vm.fail("docker ps -a --format '{{.Names}}' | grep -q prowlarr")
        '';
      };

      # ---------------------------------------------------------------
      # Test: backup-restore — backup with encryption, verify, restore
      # ---------------------------------------------------------------
      backupRestoreTest = mkTest {
        diskSize = "+8G";
        testScript = ''
          ${bootstrap}
          ${installDocker}

          # Install prowlarr and let it initialize
          vm.succeed(as_user("mithrandir install prowlarr"), timeout=300)
          vm.wait_for_open_port(9696)
          vm.succeed("sleep 5")

          # Enable backup encryption
          vm.succeed(as_user("echo 'BACKUP_PASSWORD=testpass123' >> /home/testuser/homelab/.env"))

          # Run backup (non-TTY path, as non-root user exercising sudo codepaths)
          vm.succeed(as_user("mithrandir backup"), timeout=300)

          # Verify encrypted backup archive exists
          vm.succeed("test -f /backups/latest/prowlarr.tar.zst.enc")

          # Verify no unencrypted duplicates (the bug this test guards against)
          vm.fail("test -f /backups/latest/prowlarr.tar.zst")

          # Verify encrypted secrets backup
          vm.succeed("test -f /backups/latest/secrets.tar.zst.enc")
          vm.fail("test -f /backups/latest/secrets.tar.zst")

          # Verify backup integrity
          vm.succeed(as_user("mithrandir backup verify"), timeout=120)
          vm.succeed(as_user("mithrandir backup verify --extract"), timeout=120)

          # Restore from encrypted backup
          vm.succeed(as_user("mithrandir restore prowlarr --yes"), timeout=300)

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
          vm.succeed(as_user("mithrandir install prowlarr"), timeout=300)

          # version
          output = vm.succeed(as_user("mithrandir version"))
          assert "." in output or "v" in output.lower() or len(output.strip()) > 0, f"Expected version output, got: {output}"

          # config
          output = vm.succeed(as_user("mithrandir config"))
          assert "BASE_DIR" in output, f"Expected 'BASE_DIR' in config output, got: {output}"

          # health
          output = vm.succeed(as_user("mithrandir health"))
          assert "docker" in output.lower(), f"Expected 'docker' in health output, got: {output}"

          # doctor
          vm.succeed(as_user("mithrandir doctor"))

          # capacity
          vm.succeed(as_user("mithrandir capacity"))

          # status
          output = vm.succeed(as_user("mithrandir status"))
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

          # Install prowlarr
          vm.succeed(as_user("mithrandir install prowlarr"), timeout=300)
          vm.wait_for_open_port(9696)
          vm.succeed("sleep 5")

          # Enable backup encryption
          vm.succeed(as_user("echo 'BACKUP_PASSWORD=testpass123' >> /home/testuser/homelab/.env"))

          # Update (exercises backup + pull + restart, as non-root)
          vm.succeed(as_user("mithrandir update prowlarr --yes"), timeout=600)

          # Verify container still running
          vm.succeed("docker ps --format '{{.Names}}' | grep -q prowlarr")
          vm.wait_for_open_port(9696)

          # Verify pre-update backup was created (encrypted)
          vm.succeed("test -f /backups/latest/prowlarr.tar.zst.enc")
          vm.fail("test -f /backups/latest/prowlarr.tar.zst")
        '';
      };

      # ---------------------------------------------------------------
      # Test: firewall — mithrandir install firewall (UFW + ufw-docker)
      # Verifies UFW activation, ufw-docker install, and per-app rule
      # sync on install/uninstall. Prowlarr is bridge-networked, so
      # rules land in the DOCKER-USER chain via ufw-docker.
      # ---------------------------------------------------------------
      firewallTest = mkTest {
        diskSize = "+6G";
        testScript = ''
          ${bootstrap}
          ${installDocker}

          # Install prowlarr BEFORE firewall so `install firewall` back-fills rules.
          vm.succeed(as_user("mithrandir install prowlarr"), timeout=300)
          vm.wait_for_open_port(9696)

          # Install firewall
          vm.succeed(as_user("mithrandir install firewall"), timeout=300)

          # UFW is installed, active, and ufw-docker is present
          vm.succeed("which ufw")
          vm.succeed("test -x /usr/local/bin/ufw-docker")
          status = vm.succeed("ufw status")
          assert "Status: active" in status, f"Expected UFW active, got: {status}"

          # SSH is always allowed to prevent lockouts
          assert "22" in status, f"Expected SSH rule in UFW status, got: {status}"

          # ENABLE_FIREWALL was persisted to .env
          vm.succeed("grep -q '^ENABLE_FIREWALL=true' /home/testuser/homelab/.env")

          # ufw-docker back-filled a rule for the already-installed prowlarr container
          ufw_docker_status = vm.succeed("ufw-docker status")
          assert "prowlarr" in ufw_docker_status, \
            f"Expected prowlarr rule in ufw-docker status, got: {ufw_docker_status}"

          # Installing a new app while firewall is active adds rules automatically.
          # Sonarr is lighter to pull than most; we reuse prowlarr's uninstall/reinstall
          # path to avoid another large image pull.
          vm.succeed(as_user("mithrandir uninstall prowlarr --yes"), timeout=120)
          after_uninstall = vm.succeed("ufw-docker status")
          assert "prowlarr" not in after_uninstall, \
            f"Expected prowlarr rule removed after uninstall, got: {after_uninstall}"

          vm.succeed(as_user("mithrandir install prowlarr"), timeout=300)
          after_reinstall = vm.succeed("ufw-docker status")
          assert "prowlarr" in after_reinstall, \
            f"Expected prowlarr rule restored after reinstall, got: {after_reinstall}"

          # Idempotency: running install firewall again should succeed
          vm.succeed(as_user("mithrandir install firewall"), timeout=180)
          vm.succeed("ufw status | grep -q 'Status: active'")
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
        firewall = firewallTest.driver;
        firewall-interactive = firewallTest.driverInteractive;
      };

      checks.${system} = {
        getting-started = gettingStartedTest.driver;
        docker-install = dockerInstallTest.driver;
        app-lifecycle = appLifecycleTest.driver;
        backup-restore = backupRestoreTest.driver;
        diagnostics = diagnosticsTest.driver;
        update = updateTest.driver;
        firewall = firewallTest.driver;
      };
    };
}

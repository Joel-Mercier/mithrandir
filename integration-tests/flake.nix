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

      # ---------------------------------------------------------------
      # Getting started flow: git clone → install.sh → mithrandir --help
      # ---------------------------------------------------------------
      gettingStartedTest = nix-vm-test.lib.${system}.debian."13" {
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

    in {
      packages.${system} = {
        default = gettingStartedTest.driver;
        interactive = gettingStartedTest.driverInteractive;
      };

      checks.${system}.getting-started = gettingStartedTest.driver;
    };
}

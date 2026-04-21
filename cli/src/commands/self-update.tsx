import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { shell } from "@/lib/shell.js";
import { getProjectRoot, loadEnvConfig } from "@/lib/config.js";
import { isUiServiceActive, restartUiService } from "@/lib/systemd-ui.js";
import { isTusdServiceActive, installTusdService } from "@/lib/systemd-tusd.js";
import { deployUiBuild } from "@/lib/deploy-ui.js";
import { Header } from "@/components/Header.js";
import { AppStatus } from "@/components/AppStatus.js";

interface CompletedStep {
  name: string;
  status: "done" | "error" | "skipped";
  message?: string;
}

function SelfUpdateCommand() {
  const { exit } = useApp();
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [currentLabel, setCurrentLabel] = useState("Initializing...");
  const [phase, setPhase] = useState<"running" | "done" | "error">("running");
  const [error, setError] = useState<string | null>(null);

  function addStep(step: CompletedStep) {
    setCompletedSteps((prev) => [...prev, step]);
  }

  useEffect(() => {
    run();
  }, []);

  useEffect(() => {
    if (phase === "error" || phase === "done") {
      const timer = setTimeout(() => exit(), 500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  async function run() {
    let root: string;
    try {
      root = getProjectRoot();
    } catch {
      setError("Could not find mithrandir project root.");
      setPhase("error");
      return;
    }

    try {
      // When running under sudo, run git/bun as the original user so
      // SSH keys and credentials are available
      const sudoUser = process.env.SUDO_USER;
      const currentUser = sudoUser || process.env.USER || process.env.LOGNAME;
      const resolveUser = sudoUser || currentUser;
      const userOpts = sudoUser ? { user: sudoUser } : {};

      // Step 1: Check git is available
      const gitCheck = await shell("which", ["git"], { ignoreError: true });
      if (gitCheck.exitCode !== 0) {
        setError("git is not installed.");
        setPhase("error");
        return;
      }

      // Step 2: Fetch and pull latest changes
      setCurrentLabel("Pulling latest changes from git...");
      const fetch = await shell("git", ["fetch", "--all"], { cwd: root, ignoreError: true, ...userOpts });
      if (fetch.exitCode !== 0) {
        setError(`git fetch failed: ${fetch.stderr}`);
        setPhase("error");
        return;
      }

      const currentBranch = await shell("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, ignoreError: true, ...userOpts });
      if (currentBranch.exitCode !== 0) {
        setError(`Could not determine current branch: ${currentBranch.stderr}`);
        setPhase("error");
        return;
      }
      const branch = currentBranch.stdout.trim();

      const beforeHash = await shell("git", ["rev-parse", "HEAD"], { cwd: root, ignoreError: true, ...userOpts });
      if (beforeHash.exitCode !== 0) {
        setError(`Could not determine current commit: ${beforeHash.stderr}`);
        setPhase("error");
        return;
      }

      const pull = await shell("git", ["pull", "--ff-only"], { cwd: root, ignoreError: true, ...userOpts });
      if (pull.exitCode !== 0) {
        setError(`git pull failed (non-fast-forward?):\n${pull.stderr}`);
        setPhase("error");
        return;
      }

      const afterHash = await shell("git", ["rev-parse", "HEAD"], { cwd: root, ignoreError: true, ...userOpts });
      const before = beforeHash.stdout.trim().slice(0, 8);
      const after = afterHash.stdout.trim().slice(0, 8);

      if (before === after) {
        addStep({ name: "Git pull", status: "skipped", message: `Already up to date on ${branch} (${before})` });
      } else {
        addStep({ name: "Git pull", status: "done", message: `${branch}: ${before} → ${after}` });
      }

      // Step 3: Check and upgrade Bun if pinned version differs
      const bunVersionFile = join(root, ".bun-version");
      if (existsSync(bunVersionFile)) {
        const pinnedVersion = readFileSync(bunVersionFile, "utf-8").trim();
        const currentBunVersion = await shell("bun", ["--version"], { ignoreError: true });
        const currentVersion = currentBunVersion.stdout.trim();

        if (currentVersion && currentVersion !== pinnedVersion) {
          setCurrentLabel(`Upgrading Bun ${currentVersion} → ${pinnedVersion}...`);

          // Resolve the user's home directory for BUN_INSTALL
          let bunInstallDir = "";
          if (resolveUser) {
            const passwd = await shell("getent", ["passwd", resolveUser], { ignoreError: true });
            if (passwd.exitCode === 0 && passwd.stdout.trim()) {
              const userHome = passwd.stdout.split(":")[5];
              if (userHome) bunInstallDir = `${userHome}/.bun`;
            }
          }

          const env = bunInstallDir ? { BUN_INSTALL: bunInstallDir } : undefined;
          const upgrade = await shell("bash", ["-c", `curl -fsSL https://bun.com/install | bash -s "bun-v${pinnedVersion}"`], {
            ignoreError: true,
            env,
            ...userOpts,
          });

          if (upgrade.exitCode === 0) {
            // Fix /usr/local/bin symlinks after upgrade
            if (bunInstallDir) {
              await shell("ln", ["-sf", `${bunInstallDir}/bin/bun`, "/usr/local/bin/bun"], { sudo: true, ignoreError: true });
              await shell("ln", ["-sf", `${bunInstallDir}/bin/bunx`, "/usr/local/bin/bunx"], { sudo: true, ignoreError: true });
            }
            addStep({ name: "Bun runtime", status: "done", message: `${currentVersion} → ${pinnedVersion}` });
          } else {
            addStep({ name: "Bun runtime", status: "error", message: `Failed to upgrade to ${pinnedVersion}` });
          }
        } else {
          addStep({ name: "Bun runtime", status: "skipped", message: `Already at ${pinnedVersion}` });
        }
      }

      // Step 4: Install dependencies
      // Ensure the project directory is writable by the original user
      // (files may be root-owned from a previous sudo install/build).
      // When running under sudo we can chown directly; otherwise use sudo
      // but only target dirs bun install writes to (not the entire project).
      if (sudoUser) {
        await shell("chown", ["-R", `${sudoUser}:`, root], { ignoreError: true });
      } else if (currentUser) {
        await shell("chown", ["-R", `${currentUser}:`, join(root, "node_modules")], { sudo: true, ignoreError: true });
        await shell("chown", [`${currentUser}:`, join(root, "bun.lock")], { sudo: true, ignoreError: true });
        // Also fix workspace node_modules
        for (const ws of ["cli", "ui", "docs"]) {
          await shell("chown", ["-R", `${currentUser}:`, join(root, ws, "node_modules")], { sudo: true, ignoreError: true });
        }
      }

      // Resolve the user's bun binary path — /usr/local/bin/bun may point to
      // /root/.bun which is inaccessible, or the bun in PATH may be a
      // different version. Look up the real user's ~/.bun/bin/bun directly.
      let bunPath = "bun";
      if (resolveUser) {
        const passwd = await shell("getent", ["passwd", resolveUser], { ignoreError: true });
        if (passwd.exitCode === 0 && passwd.stdout.trim()) {
          const userHome = passwd.stdout.split(":")[5];
          if (userHome) {
            const userBun = `${userHome}/.bun/bin/bun`;
            const bunExists = await shell("test", ["-x", userBun], { ignoreError: true });
            if (bunExists.exitCode === 0) {
              bunPath = userBun;

              // Fix the /usr/local/bin symlink to point to the correct bun
              await shell("ln", ["-sf", userBun, "/usr/local/bin/bun"], { sudo: true, ignoreError: true });
              await shell("ln", ["-sf", `${userHome}/.bun/bin/bunx`, "/usr/local/bin/bunx"], { sudo: true, ignoreError: true });
            }
          }
        }
      }

      setCurrentLabel("Installing dependencies...");
      const install = await shell(bunPath, ["install"], { cwd: root, ignoreError: true, ...userOpts });
      if (install.exitCode !== 0) {
        const output = [install.stderr, install.stdout].filter(Boolean).join("\n");
        setError(`bun install failed:\n${output}`);
        setPhase("error");
        return;
      }
      addStep({ name: "Dependencies", status: "done", message: "bun install complete" });

      // Step 4: Build CLI
      setCurrentLabel("Building CLI...");

      const distDir = join(root, "cli", "dist");
      const distFile = join(distDir, "mithrandir.js");

      const build = await shell(bunPath, ["run", "cli:build"], { cwd: root, ignoreError: true, ...userOpts });
      if (build.exitCode !== 0) {
        setError(`Build failed:\n${build.stderr}`);
        setPhase("error");
        return;
      }
      addStep({ name: "Build CLI", status: "done", message: "cli/dist/mithrandir.js rebuilt" });

      // Step 5: Apply database migrations (idempotent)
      // Runs before the UI restart so the DB schema matches the new code
      // when the service boots. The UI server also runs migrations on
      // startup as a safety net, but doing it here surfaces failures early.
      setCurrentLabel("Applying database migrations...");
      const envLocalPath = join(root, "ui", ".env.local");
      let dbFileName = "";
      if (existsSync(envLocalPath)) {
        const envContents = readFileSync(envLocalPath, "utf-8");
        const match = envContents.match(/^DB_FILE_NAME=(.+)$/m);
        if (match) dbFileName = match[1].trim();
      }
      if (dbFileName) {
        const migrate = await shell(bunPath, ["x", "drizzle-kit", "migrate"], {
          cwd: join(root, "ui"),
          ignoreError: true,
          env: { DB_FILE_NAME: dbFileName },
          ...userOpts,
        });
        if (migrate.exitCode !== 0) {
          const output = [migrate.stderr, migrate.stdout].filter(Boolean).join("\n");
          addStep({ name: "Database migrations", status: "error", message: output.slice(0, 300) });
        } else {
          addStep({ name: "Database migrations", status: "done", message: "Schema up to date" });
        }
      } else {
        addStep({ name: "Database migrations", status: "skipped", message: "ui/.env.local not configured" });
      }

      // Step 6: Rebuild UI
      setCurrentLabel("Building UI...");
      // Fix ownership of ui/ — the systemd service runs as root and creates
      // various dirs that the build process needs to overwrite.
      // Always attempt this with sudo since root-owned files can exist
      // regardless of whether self-update was invoked with sudo.
      if (currentUser) {
        await shell("chown", ["-R", `${currentUser}:`, join(root, "ui")], { sudo: true, ignoreError: true });
      }
      const uiBuild = await shell(bunPath, ["run", "ui:build"], { cwd: root, ignoreError: true, ...userOpts });
      if (uiBuild.exitCode !== 0) {
        addStep({ name: "Build UI", status: "skipped", message: "UI build failed (non-critical)" });
      } else {
        // Deploy build output to blue-green deployment slot
        await deployUiBuild(join(root, "ui"));
        addStep({ name: "Build UI", status: "done", message: "UI rebuilt and deployed" });

        // Ensure tusd is set up (handles upgrade from pre-tusd versions)
        const uiWasActive = await isUiServiceActive();
        if (uiWasActive) {
          setCurrentLabel("Setting up upload server...");
          try {
            const tusdBin = join(root, "ui", ".tusd", "tusd");
            if (!existsSync(tusdBin)) {
              const dl = await shell(bunPath, ["run", join(root, "ui", "scripts", "download-tusd.ts")], {
                cwd: join(root, "ui"),
                ignoreError: true,
                ...userOpts,
              });
              if ((dl.exitCode ?? 0) === 0) {
                addStep({ name: "Download tusd", status: "done" });
              } else {
                addStep({ name: "Download tusd", status: "skipped", message: "Download failed (non-critical)" });
              }
            }

            const tusdWasActive = await isTusdServiceActive();
            if (!tusdWasActive && existsSync(tusdBin)) {
              const envConfig = await loadEnvConfig();
              const uploadDir = join(envConfig.BASE_DIR, "data/media/.uploads");
              mkdirSync(uploadDir, { recursive: true });
              await installTusdService(root, uploadDir);
              addStep({ name: "tusd service", status: "done", message: "Installed" });
            } else if (tusdWasActive) {
              await shell("systemctl", ["restart", "mithrandir-tusd"], { sudo: true });
              addStep({ name: "tusd service", status: "done", message: "Restarted" });
            }
          } catch {
            addStep({ name: "tusd service", status: "skipped", message: "Setup failed (non-critical)" });
          }

          setCurrentLabel("Restarting UI service...");
          try {
            await restartUiService();
            addStep({ name: "UI service", status: "done", message: "Restarted" });
          } catch {
            addStep({ name: "UI service", status: "skipped", message: "Restart failed (non-critical)" });
          }
        }
      }

      // Step 6: Always re-create symlink to ensure it points to the correct path
      // (handles architecture changes like dist/ → cli/dist/)
      setCurrentLabel("Installing mithrandir command...");
      await shell("ln", ["-sf", distFile, "/usr/local/bin/mithrandir"], { sudo: true });
      addStep({ name: "Symlink", status: "done", message: "/usr/local/bin/mithrandir → cli/dist/mithrandir.js" });

      setPhase("done");
    } catch (err: any) {
      setError(err.message ?? String(err));
      setPhase("error");
    }
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header title="Self Update" />
        {completedSteps.map((step, i) => (
          <AppStatus
            key={i}
            name={step.name}
            status={step.status}
            message={step.message}
          />
        ))}
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Self Update" />

      {completedSteps.map((step, i) => (
        <AppStatus
          key={i}
          name={step.name}
          status={step.status}
          message={step.message}
        />
      ))}

      {phase === "running" && (
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}{currentLabel}
        </Text>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <StatusMessage variant="success">
            Mithrandir has been updated successfully
          </StatusMessage>
        </Box>
      )}
    </Box>
  );
}

export async function runSelfUpdate() {
  const { waitUntilExit } = render(<SelfUpdateCommand />);
  await waitUntilExit();
}

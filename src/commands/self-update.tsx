import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { existsSync } from "fs";
import { join } from "path";
import { shell } from "@/lib/shell.js";
import { getProjectRoot } from "@/lib/config.js";
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
        addStep({ name: "Git pull", status: "done", message: `Already up to date on ${branch} (${before})` });
      } else {
        addStep({ name: "Git pull", status: "done", message: `${branch}: ${before} → ${after}` });
      }

      // Step 3: Install dependencies
      // Ensure the project directory is writable by the original user
      // (files may be root-owned from a previous sudo install/build)
      if (sudoUser) {
        await shell("chown", ["-R", `${sudoUser}:`, root], { ignoreError: true });
      }

      // Resolve the user's bun binary path — /usr/local/bin/bun may point to
      // /root/.bun which is inaccessible via sudo -u. Look up the real user's
      // home and use their ~/.bun/bin/bun directly.
      let bunPath = "bun";
      if (sudoUser) {
        const passwd = await shell("getent", ["passwd", sudoUser], { ignoreError: true });
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
        setError(`bun install failed:\n${install.stderr}`);
        setPhase("error");
        return;
      }
      addStep({ name: "Dependencies", status: "done", message: "bun install complete" });

      // Step 4: Build CLI
      setCurrentLabel("Building CLI...");

      const distDir = join(root, "dist");
      const distFile = join(distDir, "mithrandir.js");

      const build = await shell(bunPath, ["run", "build"], { cwd: root, ignoreError: true, ...userOpts });
      if (build.exitCode !== 0) {
        setError(`Build failed:\n${build.stderr}`);
        setPhase("error");
        return;
      }
      addStep({ name: "Build", status: "done", message: "dist/mithrandir.js rebuilt" });

      // Step 5: Verify symlink
      if (existsSync("/usr/local/bin/mithrandir")) {
        addStep({ name: "Symlink", status: "done", message: "/usr/local/bin/mithrandir → dist/mithrandir.js" });
      } else {
        // Re-create symlink if missing
        setCurrentLabel("Installing mithrandir command...");
        await shell("ln", ["-sf", distFile, "/usr/local/bin/mithrandir"], { sudo: true });
        addStep({ name: "Symlink", status: "done", message: "Re-created /usr/local/bin/mithrandir" });
      }

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

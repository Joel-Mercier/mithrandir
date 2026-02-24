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
      setCurrentLabel("Installing dependencies...");
      const install = await shell("bun", ["install"], { cwd: root, ignoreError: true, ...userOpts });
      if (install.exitCode !== 0) {
        setError(`bun install failed:\n${install.stderr}`);
        setPhase("error");
        return;
      }
      addStep({ name: "Dependencies", status: "done", message: "bun install complete" });

      // Step 4: Build CLI
      setCurrentLabel("Building CLI...");

      // Ensure dist/ and mithrandir.js are writable (may be root-owned from previous sudo install)
      const distDir = join(root, "dist");
      const distFile = join(distDir, "mithrandir.js");
      if (existsSync(distDir)) {
        await shell("chmod", ["-R", "u+w", distDir], { ignoreError: true });
      }

      const build = await shell("bun", ["run", "build"], { cwd: root, ignoreError: true, ...userOpts });
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

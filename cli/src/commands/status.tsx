import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { DataTable } from "@/components/DataTable.js";
import Link from "ink-link";
import { Divider } from "@/components/Divider.js";
import { Header } from "@/components/Header.js";
import { gatherSystemInfo } from "@/lib/status.js";
import type { SystemInfo } from "@/lib/status.js";

// ─── Table helpers ───────────────────────────────────────────────────────────

function statusDotChar(status: string): string {
  const dot =
    status === "running"
      ? "● "
      : status === "restarting"
        ? "● "
        : status === "not found" || status === "unknown"
          ? "● "
          : "● ";
  return dot + status;
}

function pad(str: string, width: number): string {
  return str + " ".repeat(Math.max(0, width - str.length));
}

// ─── Interactive (TTY) component ─────────────────────────────────────────────

function StatusCommand() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gatherSystemInfo()
      .then((result) => {
        setInfo(result);
        setPhase("done");
        const t = setTimeout(() => exit(), 100);
        t.unref();
      })
      .catch((err) => {
        setError(err.message);
        setPhase("error");
        const t = setTimeout(() => {
          process.exitCode = 1;
          exit();
        }, 100);
        t.unref();
      });
  }, []);

  if (phase === "error") {
    return (
      <Box flexDirection="column">
        <Header title="System Status" />
        <StatusMessage variant="error">Failed: {error}</StatusMessage>
      </Box>
    );
  }

  if (phase === "loading" || !info) {
    return (
      <Box flexDirection="column">
        <Header title="System Status" />
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Gathering system information...
        </Text>
      </Box>
    );
  }

  const runningCount = info.apps.filter((a) => a.containerStatus === "running").length;
  const stoppedCount = info.apps.length - runningCount;

  const tableData = info.apps.map((a) => ({
    App: a.app.displayName,
    Status: statusDotChar(a.containerStatus),
    Backup: a.lastBackup ?? "none",
    Disk: a.diskUsage,
  }));

  return (
    <Box flexDirection="column">
      <Header title="System Status" />

      {/* System services */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>
          {"  Docker          "}
          {info.dockerRunning ? (
            <Text color="green">● Running</Text>
          ) : (
            <Text color="red">● Not running</Text>
          )}
        </Text>
        {info.timerActive !== null && (
          <Text>
            {"  Backup Timer    "}
            {info.timerActive ? (
              <>
                <Text color="green">● Active</Text>
                {info.timerNext && <Text dimColor> — Next: {info.timerNext}</Text>}
              </>
            ) : (
              <Text color="red">● Inactive</Text>
            )}
          </Text>
        )}
        <Text>
          {"  Docs Site       "}
          {info.docsRunning ? (
            <Text color="green">● Running</Text>
          ) : (
            <Text dimColor>● Not running</Text>
          )}
        </Text>
      </Box>

      <Divider title="Services" titleColor="yellow" dividerColor="gray" />

      {info.apps.length === 0 ? (
        <Text dimColor>  No apps installed.</Text>
      ) : (
        <Box flexDirection="column">
          <DataTable data={tableData} />

          {/* Clickable URLs */}
          <Box flexDirection="column" marginTop={1}>
            <Text bold>  Quick Links:</Text>
            {info.apps
              .filter((a) => a.url && a.app.name !== "flaresolverr")
              .map((a) => (
                <Text key={a.app.name}>
                  {"    "}{a.app.displayName.padEnd(18)}
                  <Link url={a.url!}>
                    <Text color="cyan">{a.url}</Text>
                  </Link>
                </Text>
              ))}
            {info.docsRunning && info.docsUrl ? (
              <Text>
                {"    "}{"Docs".padEnd(18)}
                <Link url={info.docsUrl}>
                  <Text color="cyan">{info.docsUrl}</Text>
                </Link>
              </Text>
            ) : (
              <Text dimColor>
                {"    "}Run 'mithrandir docs' to browse the documentation
              </Text>
            )}
          </Box>
        </Box>
      )}

      {/* Summary */}
      {info.apps.length > 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            {"  "}
            {info.apps.length} app{info.apps.length !== 1 ? "s" : ""} installed
            {" — "}
            {runningCount} running
            {stoppedCount > 0 && `, ${stoppedCount} stopped`}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// ─── Headless (non-TTY) ──────────────────────────────────────────────────────

async function runHeadlessStatus(): Promise<void> {
  const info = await gatherSystemInfo();

  console.log("=== System Status ===");
  console.log(
    `Docker: ${info.dockerRunning ? "Running" : "Not running"}`,
  );
  if (info.timerActive !== null) {
    const timerStr = info.timerActive
      ? `Active${info.timerNext ? ` — Next: ${info.timerNext}` : ""}`
      : "Inactive";
    console.log(`Backup Timer: ${timerStr}`);
  }
  console.log(`Docs Site: ${info.docsRunning ? "Running" : "Not running"}`);
  if (info.docsRunning && info.docsUrl) {
    console.log(`Docs URL: ${info.docsUrl}`);
  } else {
    console.log(`Docs: Run 'mithrandir docs' to browse the documentation`);
  }
  console.log("");

  if (info.apps.length === 0) {
    console.log("No apps installed.");
    return;
  }

  // Print plaintext table
  const nameW = Math.max(4, ...info.apps.map((a) => a.app.displayName.length));
  const statusW = Math.max(6, ...info.apps.map((a) => a.containerStatus.length));
  const urlW = Math.max(3, ...info.apps.map((a) => (a.url ?? "—").length));
  const backupW = 10;
  const diskW = Math.max(4, ...info.apps.map((a) => a.diskUsage.length));

  const header = `${pad("App", nameW)}  ${pad("Status", statusW)}  ${pad("URL", urlW)}  ${pad("Backup", backupW)}  ${pad("Disk", diskW)}`;
  console.log(header);
  console.log("-".repeat(header.length));

  for (const a of info.apps) {
    console.log(
      `${pad(a.app.displayName, nameW)}  ${pad(a.containerStatus, statusW)}  ${pad(a.url ?? "—", urlW)}  ${pad(a.lastBackup ?? "none", backupW)}  ${pad(a.diskUsage, diskW)}`,
    );
  }

  const runningCount = info.apps.filter((a) => a.containerStatus === "running").length;
  const stoppedCount = info.apps.length - runningCount;
  console.log("");
  console.log(
    `${info.apps.length} app${info.apps.length !== 1 ? "s" : ""} installed — ${runningCount} running${stoppedCount > 0 ? `, ${stoppedCount} stopped` : ""}`,
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runStatus(): Promise<void> {
  if (process.stdout.isTTY) {
    const { waitUntilExit } = render(<StatusCommand />);
    await waitUntilExit();
  } else {
    await runHeadlessStatus();
  }
}

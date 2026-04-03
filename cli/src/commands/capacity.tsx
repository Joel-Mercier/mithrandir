import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { DataTable } from "@/components/DataTable.js";
import { Divider } from "@/components/Divider.js";
import { Header } from "@/components/Header.js";
import {
  gatherCapacityReport,
  formatBytes,
  scoreLabel,
  type CapacityReport,
  type StorageInfo,
} from "@/lib/capacity.js";

// ─── Progress bar ───────────────────────────────────────────────────────────

function ProgressBar({ percent, width = 30 }: { percent: number; width?: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  const color = clamped >= 95 ? "red" : clamped >= 80 ? "yellow" : "green";
  return (
    <Text>
      <Text color={color}>{"█".repeat(filled)}</Text>
      <Text dimColor>{"░".repeat(empty)}</Text>
      <Text> {clamped.toFixed(1)}%</Text>
    </Text>
  );
}

// ─── Storage section ────────────────────────────────────────────────────────

function StorageSection({ storage }: { storage: StorageInfo[] }) {
  if (storage.length === 0) {
    return <Text dimColor>  No storage information available.</Text>;
  }

  return (
    <Box flexDirection="column">
      {storage.map((s) => {
        const pct = s.totalBytes > 0 ? (s.usedBytes / s.totalBytes) * 100 : 0;
        return (
          <Box key={s.mountpoint} flexDirection="column" marginBottom={1}>
            <Text>  <Text bold>{s.mountpoint}</Text></Text>
            <Box marginLeft={2}>
              <ProgressBar percent={pct} width={40} />
            </Box>
            <Text dimColor>
              {"    "}{formatBytes(s.usedBytes)} used / {formatBytes(s.totalBytes)} total ({formatBytes(s.availBytes)} free)
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ─── Score bar ──────────────────────────────────────────────────────────────

function ScoreBar({ score, max, label }: { score: number; max: number; label: string }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const width = 20;
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  const color = pct >= 75 ? "red" : pct >= 50 ? "yellow" : "green";
  return (
    <Box>
      <Text>  {label.padEnd(14)}</Text>
      <Text color={color}>{"█".repeat(filled)}</Text>
      <Text dimColor>{"░".repeat(empty)}</Text>
      <Text> {score}/{max}</Text>
    </Box>
  );
}

// ─── Interactive (TTY) component ────────────────────────────────────────────

function CapacityCommand() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [report, setReport] = useState<CapacityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gatherCapacityReport()
      .then((result) => {
        setReport(result);
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
        <Header title="Capacity" />
        <StatusMessage variant="error">Failed: {error}</StatusMessage>
      </Box>
    );
  }

  if (phase === "loading" || !report) {
    return (
      <Box flexDirection="column">
        <Header title="Capacity" />
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Analyzing system capacity...
        </Text>
      </Box>
    );
  }

  const { system, apps } = report;
  const installedApps = apps.filter((a) => a.installed);

  // Build table data for installed apps
  const tableData = installedApps.map((a) => ({
    App: a.app.displayName,
    Performance: `${scoreIcon(a.performanceScore)} ${scoreLabel(a.performanceScore)}`,
    Storage: `${scoreIcon(a.storageScore)} ${scoreLabel(a.storageScore)}`,
    Disk: a.diskUsage,
  }));

  return (
    <Box flexDirection="column">
      <Header title="Capacity" />

      {/* System hardware info */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>  <Text bold>CPU</Text>{"           "}{system.cpuModel}</Text>
        <Text>  <Text bold>Cores</Text>{"         "}{system.cpuCores}</Text>
        <Text>  <Text bold>RAM</Text>{"           "}{system.ramTotalMB > 0 ? `${(system.ramTotalMB / 1024).toFixed(1)} GB` : "Unknown"}</Text>
      </Box>

      <Divider title="Storage" titleColor="cyan" dividerColor="gray" />
      <Box marginTop={1}>
        <Box flexDirection="column">
          <StorageSection storage={system.storage} />
        </Box>
      </Box>

      <Box marginTop={1}>
        <Divider title="Installed Apps" titleColor="yellow" dividerColor="gray" />
      </Box>

      {installedApps.length === 0 ? (
        <Text dimColor>  No apps installed.</Text>
      ) : (
        <Box flexDirection="column">
          <DataTable data={tableData} />
        </Box>
      )}

      {installedApps.length > 0 && (
        <>
          <Box marginTop={1}>
            <Divider title="Capacity Score" titleColor="magenta" dividerColor="gray" />
          </Box>

          <Box flexDirection="column" marginTop={1}>
            <ScoreBar
              score={report.totalPerformanceScore}
              max={report.maxPerformanceScore}
              label="Performance"
            />
            <ScoreBar
              score={report.totalStorageScore}
              max={report.maxStorageScore}
              label="Storage"
            />
          </Box>

          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Text>  Performance:   </Text>
              <Text color={report.performanceVerdict.color} bold>
                {report.performanceVerdict.label}
              </Text>
            </Box>
            <Box>
              <Text>  Storage:       </Text>
              <Text color={report.storageVerdict.color as any} bold>
                {report.storageVerdict.label}
              </Text>
            </Box>
          </Box>

          <Box marginTop={1}>
            <Text dimColor>
              {"  "}{installedApps.length} app{installedApps.length !== 1 ? "s" : ""} installed
              {" — "}{installedApps.filter((a) => a.performanceScore === "high").length} high-performance
              {", "}{installedApps.filter((a) => a.storageScore === "high").length} high-storage
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
}

function scoreIcon(score: "low" | "medium" | "high"): string {
  return score === "low" ? "●" : score === "medium" ? "●" : "●";
}

// ─── Headless (non-TTY) ────────────────────────────────────────────────────

function pad(str: string, width: number): string {
  return str + " ".repeat(Math.max(0, width - str.length));
}

async function runHeadlessCapacity(): Promise<void> {
  const report = await gatherCapacityReport();
  const { system, apps } = report;
  const installedApps = apps.filter((a) => a.installed);

  console.log("=== System Capacity ===");
  console.log(`CPU: ${system.cpuModel}`);
  console.log(`Cores: ${system.cpuCores}`);
  console.log(`RAM: ${system.ramTotalMB > 0 ? `${(system.ramTotalMB / 1024).toFixed(1)} GB` : "Unknown"}`);
  console.log("");

  if (system.storage.length > 0) {
    console.log("--- Storage ---");
    for (const s of system.storage) {
      const pct = s.totalBytes > 0 ? ((s.usedBytes / s.totalBytes) * 100).toFixed(1) : "0";
      console.log(`${s.mountpoint}: ${formatBytes(s.usedBytes)}/${formatBytes(s.totalBytes)} (${pct}% used, ${formatBytes(s.availBytes)} free)`);
    }
    console.log("");
  }

  if (installedApps.length === 0) {
    console.log("No apps installed.");
    return;
  }

  console.log("--- Installed Apps ---");
  const nameW = Math.max(4, ...installedApps.map((a) => a.app.displayName.length));
  const header = `${pad("App", nameW)}  Performance  Storage  Disk`;
  console.log(header);
  console.log("-".repeat(header.length));

  for (const a of installedApps) {
    console.log(
      `${pad(a.app.displayName, nameW)}  ${pad(scoreLabel(a.performanceScore), 11)}  ${pad(scoreLabel(a.storageScore), 7)}  ${a.diskUsage}`,
    );
  }

  console.log("");
  console.log(`Performance: ${report.performanceVerdict.label} (${report.totalPerformanceScore}/${report.maxPerformanceScore})`);
  console.log(`Storage: ${report.storageVerdict.label} (${report.totalStorageScore}/${report.maxStorageScore})`);
}

// ─── Entry point ────────────────────────────────────────────────────────────

export async function runCapacity(): Promise<void> {
  if (process.stdout.isTTY) {
    const { waitUntilExit } = render(<CapacityCommand />);
    await waitUntilExit();
  } else {
    await runHeadlessCapacity();
  }
}

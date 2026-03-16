import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { DataTable } from "@/components/DataTable.js";
import { Header } from "@/components/Header.js";
import { runHealthChecks } from "@/lib/health.js";
import type { CheckResult, CheckStatus } from "@/lib/health.js";

// ─── Display helpers ─────────────────────────────────────────────────────────

function statusIcon(status: CheckStatus): { char: string; color: string } {
  switch (status) {
    case "pass":
      return { char: "✓", color: "green" };
    case "warn":
      return { char: "⚠", color: "yellow" };
    case "fail":
      return { char: "✗", color: "red" };
  }
}

// ─── Interactive (TTY) component ─────────────────────────────────────────────

function HealthCommand() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [results, setResults] = useState<CheckResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runHealthChecks()
      .then((checks) => {
        setResults(checks);
        setPhase("done");
        const hasFail = checks.some((c) => c.status === "fail");
        const t1 = setTimeout(() => {
          if (hasFail) process.exitCode = 1;
          exit();
        }, 100);
        t1.unref();
      })
      .catch((err) => {
        setError(err.message);
        setPhase("error");
        const t2 = setTimeout(() => {
          process.exitCode = 1;
          exit();
        }, 100);
        t2.unref();
      });
  }, []);

  if (phase === "error") {
    return (
      <Box flexDirection="column">
        <Header title="Health Check" />
        <StatusMessage variant="error">Failed: {error}</StatusMessage>
      </Box>
    );
  }

  if (phase === "loading") {
    return (
      <Box flexDirection="column">
        <Header title="Health Check" />
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Running health checks...
        </Text>
      </Box>
    );
  }

  const hasFail = results.some((r) => r.status === "fail");
  const hasWarn = results.some((r) => r.status === "warn");

  const tableData = results.map((r) => {
    const icon = statusIcon(r.status);
    return {
      Check: r.name,
      Status: `${icon.char} ${r.status.toUpperCase()}`,
      Details: r.message,
    };
  });

  return (
    <Box flexDirection="column">
      <Header title="Health Check" />
      <DataTable data={tableData} />
      <Box marginTop={1}>
        <Text dimColor>
          {"  "}
          {hasFail
            ? "One or more checks failed."
            : hasWarn
              ? "All checks passed with warnings."
              : "All checks passed."}
        </Text>
      </Box>
    </Box>
  );
}

function pad(str: string, width: number): string {
  return str + " ".repeat(Math.max(0, width - str.length));
}

// ─── Headless (non-TTY) ──────────────────────────────────────────────────────

async function runHeadlessHealth(): Promise<void> {
  const results = await runHealthChecks();

  console.log("=== Health Check ===");
  console.log("");

  const nameWidth = Math.max(...results.map((r) => r.name.length));

  for (const r of results) {
    const prefix =
      r.status === "pass"
        ? "[PASS]"
        : r.status === "warn"
          ? "[WARN]"
          : "[FAIL]";
    console.log(`${prefix} ${pad(r.name, nameWidth)}  ${r.message}`);
  }

  console.log("");

  const hasFail = results.some((r) => r.status === "fail");
  const hasWarn = results.some((r) => r.status === "warn");

  if (hasFail) {
    console.log("One or more checks failed.");
    process.exitCode = 1;
  } else if (hasWarn) {
    console.log("All checks passed with warnings.");
  } else {
    console.log("All checks passed.");
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runHealth(): Promise<void> {
  if (process.stdout.isTTY) {
    const { waitUntilExit } = render(<HealthCommand />);
    await waitUntilExit();
  } else {
    await runHeadlessHealth();
  }
}

import { useState, useEffect } from "react";
import { Box, render, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { StatusMessage } from "@inkjs/ui";
import { resolve } from "path";
import { getProjectRoot, loadEnvConfig, getBackupConfig } from "@/lib/config.js";
import { Header } from "@/components/Header.js";
import { Divider } from "@/components/Divider.js";
import { DataTable } from "@/components/DataTable.js";

function isSensitive(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.includes("token") || lower.includes("secret") || lower.includes("password");
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
}

function ConfigDisplay() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [envPath, setEnvPath] = useState("");
  const [coreData, setCoreData] = useState<Record<string, string>[]>([]);
  const [extraData, setExtraData] = useState<Record<string, string>[]>([]);
  const [backupData, setBackupData] = useState<Record<string, string>[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const root = getProjectRoot();
      const env = await loadEnvConfig(root);
      const backup = getBackupConfig(env);

      setEnvPath(resolve(root, ".env"));

      setCoreData([
        { Setting: "BASE_DIR", Value: env.BASE_DIR },
        { Setting: "PUID", Value: String(env.PUID) },
        { Setting: "PGID", Value: String(env.PGID) },
        { Setting: "TZ", Value: env.TZ },
      ]);

      const excludeKeys = new Set([
        "BASE_DIR", "PUID", "PGID", "TZ",
        "BACKUP_DIR", "LOCAL_RETENTION", "REMOTE_RETENTION", "RCLONE_REMOTE", "APPS",
      ]);
      const extras = Object.entries(env).filter(
        ([k, v]) => !excludeKeys.has(k) && v !== undefined && v !== "",
      );
      if (extras.length > 0) {
        setExtraData(
          extras.map(([key, value]) => ({
            Setting: key,
            Value: isSensitive(key) ? "****" : truncate(String(value), 40),
          })),
        );
      }

      const hourStr = String(backup.BACKUP_HOUR).padStart(2, "0");
      setBackupData([
        { Setting: "BACKUP_DIR", Value: backup.BACKUP_DIR },
        { Setting: "LOCAL_RETENTION", Value: String(backup.LOCAL_RETENTION) },
        { Setting: "REMOTE_RETENTION", Value: String(backup.REMOTE_RETENTION) },
        { Setting: "RCLONE_REMOTE", Value: backup.RCLONE_REMOTE },
        { Setting: "APPS", Value: backup.APPS },
        { Setting: "BACKUP_HOUR", Value: `${hourStr}:00` },
      ]);

      setPhase("done");
    } catch (err: any) {
      setError(err.message);
      setPhase("error");
    }
    const t = setTimeout(() => exit(), 100);
    t.unref();
  }

  if (phase === "error") {
    return (
      <Box flexDirection="column">
        <Header title="Configuration" />
        <StatusMessage variant="error">{error}</StatusMessage>
      </Box>
    );
  }

  if (phase === "loading") {
    return (
      <Box flexDirection="column">
        <Header title="Configuration" />
        <Text>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          {" "}Loading configuration...
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Configuration" />
      <Text dimColor>  {envPath}</Text>
      <Box marginTop={1}>
        <Divider title="Core Settings" width={50} titleColor="cyan" />
      </Box>
      <DataTable data={coreData} />

      {extraData.length > 0 && (
        <>
          <Box marginTop={1}>
            <Divider title="Environment Variables" width={50} titleColor="cyan" />
          </Box>
          <DataTable data={extraData} />
        </>
      )}

      <Box marginTop={1}>
        <Divider title="Backup Settings" width={50} titleColor="cyan" />
      </Box>
      <DataTable data={backupData} />
      <Text>{""}</Text>
    </Box>
  );
}

export async function runConfig(): Promise<void> {
  const { waitUntilExit } = render(<ConfigDisplay />);
  await waitUntilExit();
}

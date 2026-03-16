import { createServerFn } from "@tanstack/react-start";
import { existsSync } from "fs";
import { ensureSession } from "#/lib/auth";
import { getProjectRoot } from "./utils";
import {
  APP_REGISTRY,
  getComposePath,
  getContainerName,
  getAppDir,
  APP_CATEGORIES,
} from "@mithrandir/cli/lib/apps";
import type { AppDefinition } from "@mithrandir/cli/lib/apps";
import { loadEnvConfig } from "@mithrandir/cli/lib/config";
import {
  isContainerRunning,
  composeUp,
  composeDown,
} from "@mithrandir/cli/lib/docker";
import { shell } from "@mithrandir/cli/lib/shell";
import { getContainerStatus } from "@mithrandir/cli/lib/status";
import type { DashboardApp, AppDetail, AppCategory } from "#/lib/types";

/** Map CLI category value to UI AppCategory */
function mapCategory(app: AppDefinition): AppCategory {
  for (const cat of APP_CATEGORIES) {
    if (cat.apps.includes(app.name)) {
      return cat.value as AppCategory;
    }
  }
  return "utilities";
}

export const fetchApps = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardApp[]> => {
    await ensureSession();
    const projectRoot = getProjectRoot();
    const envConfig = await loadEnvConfig(projectRoot);
    const baseDir = envConfig.BASE_DIR;

    const apps: DashboardApp[] = [];

    for (const app of APP_REGISTRY) {
      if (app.hidden) continue;

      const composePath = getComposePath(app, baseDir);
      const installed = existsSync(composePath);

      let status: DashboardApp["status"] = "available";
      let uptime = "—";

      if (installed) {
        const containerName = getContainerName(app);
        const running = await isContainerRunning(containerName);

        if (running) {
          status = "running";
          const result = await shell(
            "docker",
            ["inspect", "--format", "{{.State.StartedAt}}", containerName],
            { sudo: true, ignoreError: true, timeout: 5000 },
          );
          if (result.exitCode === 0 && result.stdout.trim()) {
            uptime = formatUptime(result.stdout.trim());
          }
        } else {
          const statusStr = await getContainerStatus(app);
          status = statusStr === "exited" || statusStr === "created" || statusStr === "not found"
            ? "stopped"
            : "error";
        }
      }

      apps.push({
        name: app.name,
        displayName: app.displayName,
        description: app.description,
        port: app.port ?? 0,
        status,
        category: mapCategory(app),
        uptime,
      });
    }

    return apps;
  },
);

export const fetchAppDetail = createServerFn({ method: "GET" })
  .inputValidator((d: { appName: string }) => d)
  .handler(async ({ data }): Promise<AppDetail | null> => {
    await ensureSession();
    const { appName } = data;
    const projectRoot = getProjectRoot();
    const envConfig = await loadEnvConfig(projectRoot);
    const baseDir = envConfig.BASE_DIR;

    const app = APP_REGISTRY.find((a) => a.name === appName);
    if (!app) return null;

    const composePath = getComposePath(app, baseDir);
    const installed = existsSync(composePath);
    if (!installed) return null;

    const containerName = getContainerName(app);

    // Get container inspect data
    const inspectResult = await shell(
      "docker",
      ["inspect", "--format", "{{json .}}", containerName],
      { sudo: true, ignoreError: true, timeout: 10000 },
    );

    let status: DashboardApp["status"] = "stopped";
    let uptime = "—";
    let restarts = 0;
    let createdAt = "";
    let image = app.image;

    if (inspectResult.exitCode === 0) {
      try {
        const info = JSON.parse(inspectResult.stdout.trim());
        const stateStatus = info.State?.Status;
        status = stateStatus === "running" ? "running" : stateStatus === "exited" ? "stopped" : "error";
        restarts = info.RestartCount ?? 0;
        createdAt = info.Created ?? "";
        image = info.Config?.Image ?? app.image;
        if (stateStatus === "running" && info.State?.StartedAt) {
          uptime = formatUptime(info.State.StartedAt);
        }
      } catch {
        // ignore parse errors
      }
    }

    // Get resource stats if running
    let cpuUsage = 0;
    let ramUsageMB = 0;
    let networkRx = "—";
    let networkTx = "—";

    if (status === "running") {
      const statsResult = await shell(
        "docker",
        ["stats", "--no-stream", "--format", "{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}", containerName],
        { sudo: true, ignoreError: true, timeout: 10000 },
      );
      if (statsResult.exitCode === 0 && statsResult.stdout.trim()) {
        const parts = statsResult.stdout.trim().split("\t");
        cpuUsage = parseFloat(parts[0]?.replace("%", "") ?? "0") || 0;
        const memParts = parts[1]?.split("/") ?? [];
        ramUsageMB = parseMemoryMB(memParts[0]?.trim() ?? "0");
        const netParts = parts[2]?.split("/") ?? [];
        networkRx = netParts[0]?.trim() ?? "—";
        networkTx = netParts[1]?.trim() ?? "—";
      }
    }

    // Get recent logs
    const logsResult = await shell(
      "docker",
      ["logs", "--tail", "50", "--timestamps", containerName],
      { sudo: true, ignoreError: true, timeout: 10000 },
    );
    const logs = logsResult.exitCode === 0
      ? logsResult.stdout.trim().split("\n").filter(Boolean)
      : logsResult.stderr?.trim().split("\n").filter(Boolean) ?? [];

    // Build volumes list
    const configPath = `${getAppDir(app, baseDir)}/${app.configSubdir}`;
    const volumes: string[] = [`${configPath}:/config`];
    if (app.needsDataDir) {
      volumes.push(`${baseDir}/data:/data${app.dataDirReadOnly ? ":ro" : ""}`);
    }

    return {
      name: app.name,
      displayName: app.displayName,
      description: app.description,
      port: app.port ?? 0,
      status,
      category: mapCategory(app),
      uptime,
      image,
      configPath,
      volumes,
      cpuUsage: Math.round(cpuUsage),
      ramUsageMB: Math.round(ramUsageMB),
      networkRx,
      networkTx,
      restarts,
      createdAt,
      logs,
    };
  });

export const startApp = createServerFn({ method: "POST" })
  .inputValidator((d: { appName: string }) => d)
  .handler(async ({ data }) => {
    await ensureSession();
    const { appName } = data;
    const projectRoot = getProjectRoot();
    const envConfig = await loadEnvConfig(projectRoot);
    const baseDir = envConfig.BASE_DIR;

    const app = APP_REGISTRY.find((a) => a.name === appName);
    if (!app) throw new Error(`App not found: ${appName}`);

    const composePath = getComposePath(app, baseDir);
    if (!existsSync(composePath)) {
      throw new Error(`App not installed: ${appName}`);
    }

    await composeUp(composePath);
  });

export const stopApp = createServerFn({ method: "POST" })
  .inputValidator((d: { appName: string }) => d)
  .handler(async ({ data }) => {
    await ensureSession();
    const { appName } = data;
    const projectRoot = getProjectRoot();
    const envConfig = await loadEnvConfig(projectRoot);
    const baseDir = envConfig.BASE_DIR;

    const app = APP_REGISTRY.find((a) => a.name === appName);
    if (!app) throw new Error(`App not found: ${appName}`);

    const composePath = getComposePath(app, baseDir);
    if (!existsSync(composePath)) {
      throw new Error(`App not installed: ${appName}`);
    }

    await composeDown(composePath);
  });

export const restartApp = createServerFn({ method: "POST" })
  .inputValidator((d: { appName: string }) => d)
  .handler(async ({ data }) => {
    await ensureSession();
    const { appName } = data;
    const projectRoot = getProjectRoot();
    const envConfig = await loadEnvConfig(projectRoot);
    const baseDir = envConfig.BASE_DIR;

    const app = APP_REGISTRY.find((a) => a.name === appName);
    if (!app) throw new Error(`App not found: ${appName}`);

    const composePath = getComposePath(app, baseDir);
    if (!existsSync(composePath)) {
      throw new Error(`App not installed: ${appName}`);
    }

    await composeDown(composePath);
    await composeUp(composePath);
  });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUptime(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
  if (diffHours > 0) return `${diffHours}h`;
  const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${diffMin}m`;
}

function parseMemoryMB(mem: string): number {
  const match = mem.match(/^([0-9.]+)\s*([a-zA-Z]+)/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "GIB" || unit === "GB") return num * 1024;
  if (unit === "MIB" || unit === "MB") return num;
  if (unit === "KIB" || unit === "KB") return num / 1024;
  return num;
}

import { getApp, getComposePath } from "@mithrandir/cli/lib/apps";
import { generateCompose } from "@mithrandir/cli/lib/compose";
import { loadEnvConfig, saveEnvConfig } from "@mithrandir/cli/lib/config";
import { composeDown, composeUp, isContainerRunning } from "@mithrandir/cli/lib/docker";
import { parseWireguardConfig } from "@mithrandir/cli/lib/wireguard-config";
import { createServerFn } from "@tanstack/react-start";
import { existsSync } from "fs";
import { ensureSession } from "#/lib/auth";
import { logActivity } from "./activity";
import { getProjectRoot } from "./utils";

export interface GluetunConfig {
  provider: string;
  privateKey: string;
  addresses: string;
  presharedKey: string;
  serverCountries: string;
  qbittorrentUseVpn: boolean;
  gluetunInstalled: boolean;
  qbittorrentInstalled: boolean;
}

export interface ParsedWireguardPreview {
  privateKey?: string;
  addresses?: string;
  presharedKey?: string;
  endpoint?: string;
  error?: string;
}

export const fetchGluetunConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<GluetunConfig> => {
    await ensureSession();
    const projectRoot = getProjectRoot();
    const env = await loadEnvConfig(projectRoot);
    const gluetun = getApp("gluetun")!;
    const qb = getApp("qbittorrent")!;
    return {
      provider: env.VPN_SERVICE_PROVIDER ?? "",
      privateKey: env.WIREGUARD_PRIVATE_KEY ?? "",
      addresses: env.WIREGUARD_ADDRESSES ?? "",
      presharedKey: env.WIREGUARD_PRESHARED_KEY ?? "",
      serverCountries: env.SERVER_COUNTRIES ?? "",
      qbittorrentUseVpn: env.QBITTORRENT_USE_VPN === "true",
      gluetunInstalled: existsSync(getComposePath(gluetun, env.BASE_DIR)),
      qbittorrentInstalled: existsSync(getComposePath(qb, env.BASE_DIR)),
    };
  },
);

export const previewWireguardConfig = createServerFn({ method: "POST" })
  .inputValidator((d: { content: string }) => d)
  .handler(async ({ data }): Promise<ParsedWireguardPreview> => {
    await ensureSession();
    const parsed = parseWireguardConfig(data.content);
    if (!parsed) {
      return { error: "Could not find [Interface] section with PrivateKey/Address." };
    }
    return {
      privateKey: parsed.privateKey,
      addresses: parsed.addresses,
      presharedKey: parsed.presharedKey,
      endpoint: parsed.endpoint,
    };
  });

export const saveGluetunConfig = createServerFn({ method: "POST" })
  .inputValidator((d: {
    provider?: string;
    privateKey?: string;
    addresses?: string;
    presharedKey?: string;
    serverCountries?: string;
    qbittorrentUseVpn?: boolean;
  }) => d)
  .handler(async ({ data }) => {
    await ensureSession();
    const projectRoot = getProjectRoot();
    const env = await loadEnvConfig(projectRoot);

    if (data.provider !== undefined) env.VPN_SERVICE_PROVIDER = data.provider;
    if (data.privateKey !== undefined) env.WIREGUARD_PRIVATE_KEY = data.privateKey;
    if (data.addresses !== undefined) env.WIREGUARD_ADDRESSES = data.addresses;
    if (data.presharedKey !== undefined) env.WIREGUARD_PRESHARED_KEY = data.presharedKey;
    if (data.serverCountries !== undefined) env.SERVER_COUNTRIES = data.serverCountries;
    if (data.qbittorrentUseVpn !== undefined) {
      env.QBITTORRENT_USE_VPN = data.qbittorrentUseVpn ? "true" : "false";
    }
    if (!env.VPN_TYPE) env.VPN_TYPE = "wireguard";

    await saveEnvConfig(env, projectRoot);

    // Regenerate the Gluetun compose so the env changes propagate, and restart
    // the container if it exists. Then reroute qBittorrent if needed.
    const gluetun = getApp("gluetun")!;
    const gluetunCompose = getComposePath(gluetun, env.BASE_DIR);
    if (existsSync(gluetunCompose)) {
      const compose = generateCompose(gluetun, env);
      await Bun.write(gluetunCompose, compose);
      if (await isContainerRunning("gluetun")) {
        await composeDown(gluetunCompose).catch(() => {});
      }
      await composeUp(gluetunCompose).catch(() => {});
    }

    const qb = getApp("qbittorrent")!;
    const qbCompose = getComposePath(qb, env.BASE_DIR);
    if (existsSync(qbCompose) && data.qbittorrentUseVpn !== undefined) {
      const compose = generateCompose(qb, env);
      await Bun.write(qbCompose, compose);
      if (await isContainerRunning("qbittorrent")) {
        await composeDown(qbCompose).catch(() => {});
      }
      await composeUp(qbCompose).catch(() => {});
    }

    await logActivity("gluetun_configured", "system", "VPN settings updated", "/apps/gluetun");
  });

import { useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import Link from "ink-link";
import { ConfirmInput, PasswordInput, Select, TextInput } from "@inkjs/ui";
import { AppStatus } from "@/components/AppStatus.js";
import { loadEnvConfig, saveEnvConfig } from "@/lib/config.js";
import {
  TAILSCALE_ADMIN_URL,
  TAILSCALE_DOWNLOAD_URL,
  TAILSCALE_KEYS_URL,
  applyTailscaleSettingsToEnv,
  connectTailscale,
  daysUntilKeyExpiry,
  detectLanSubnet,
  enableIpForwarding,
  ensureTailscaleDaemon,
  getPendingRoutes,
  getTailscaleStatus,
  installTailscale,
  isValidCidr,
  resolveTailscaleSettings,
  sanitizeHostname,
  waitForRouteApproval,
  type TailscaleSettings,
  type TailscaleStatus,
} from "@/lib/tailscale.js";
import { allowTailscaleTraffic, isUfwActive } from "@/lib/ufw.js";
import type { EnvConfig } from "@/types.js";

/** Explainer shown before the user opts in (setup wizard + install command) */
export const TAILSCALE_EXPLAINER = [
  "Tailscale puts this server on a private, encrypted network (a \"tailnet\")",
  "tied to your Tailscale account. Install the Tailscale app on your phone or",
  "laptop, sign in with the same account, and reach your apps from anywhere —",
  "no port forwarding, nothing exposed to the internet, works behind CGNAT.",
  "Free for personal use. A Tailscale account is created on first sign-in.",
];

export interface TailscaleSetupResult {
  status: TailscaleStatus | null;
  settings: TailscaleSettings | null;
  /** Routes still waiting for admin approval */
  pendingRoutes: string[];
  /** .env keys that were written (so callers holding an EnvConfig can merge them) */
  envUpdates: Partial<EnvConfig>;
  error?: string;
}

interface TailscaleSetupProps {
  autoYes: boolean;
  /** Auth key from --auth-key or TAILSCALE_AUTH_KEY */
  authKey?: string;
  onComplete: (result: TailscaleSetupResult) => void;
}

type Phase =
  | "loading"
  | "hostname"
  | "routes"
  | "routes-custom"
  | "exit-node"
  | "ssh"
  | "auth-method"
  | "auth-key"
  | "installing"
  | "connecting"
  | "approval"
  | "finishing"
  | "done"
  | "error";

interface Step {
  name: string;
  status: "done" | "skipped" | "error";
  message: string;
}

export function TailscaleSetup({ autoYes, authKey: initialAuthKey, onComplete }: TailscaleSetupProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [steps, setSteps] = useState<Step[]>([]);
  const [settings, setSettings] = useState<TailscaleSettings | null>(null);
  const [lan, setLan] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [routeInputError, setRouteInputError] = useState<string | null>(null);
  const settingsRef = useRef<TailscaleSettings | null>(null);
  const approvalAbort = useRef<AbortController | null>(null);
  const finished = useRef(false);

  const addStep = (step: Step) => setSteps((prev) => [...prev, step]);
  const update = (patch: Partial<TailscaleSettings>) => {
    const next = { ...(settingsRef.current as TailscaleSettings), ...patch };
    settingsRef.current = next;
    setSettings(next);
  };

  useInput(
    (_input, key) => {
      if (key.return) approvalAbort.current?.abort();
    },
    { isActive: phase === "approval" && !autoYes && Boolean(process.stdin.isTTY) },
  );

  useEffect(() => {
    (async () => {
      const env = await loadEnvConfig();
      const resolved = await resolveTailscaleSettings(env);
      const detected = await detectLanSubnet();
      setLan(detected);
      settingsRef.current = resolved;
      setSettings(resolved);
      if (autoYes) {
        void run(initialAuthKey);
      } else {
        setPhase("hostname");
      }
    })().catch((err) => fail(err));
  }, []);

  function fail(err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    setError(message);
    setPhase("error");
    finish({ status: null, settings: settingsRef.current, pendingRoutes: [], envUpdates: {}, error: message });
  }

  function finish(result: TailscaleSetupResult) {
    if (finished.current) return;
    finished.current = true;
    onComplete(result);
  }

  // ─── Prompt handlers ───────────────────────────────────────────────────────

  function handleHostname(value: string) {
    update({ hostname: sanitizeHostname(value || settingsRef.current?.hostname) });
    setPhase("routes");
  }

  function handleRoutes(share: boolean) {
    if (!share) {
      update({ advertiseRoutes: [] });
      setPhase("exit-node");
    } else if (lan) {
      update({ advertiseRoutes: [lan] });
      setPhase("exit-node");
    } else {
      setPhase("routes-custom");
    }
  }

  function handleCustomRoutes(value: string) {
    const routes = value.split(",").map((s) => s.trim()).filter(Boolean);
    const invalid = routes.filter((r) => !isValidCidr(r));
    if (invalid.length > 0) {
      setRouteInputError(`Invalid subnet: ${invalid.join(", ")} (expected e.g. 192.168.1.0/24)`);
      return;
    }
    setRouteInputError(null);
    update({ advertiseRoutes: routes });
    setPhase("exit-node");
  }

  function handleExitNode(enable: boolean) {
    update({ exitNode: enable });
    setPhase("ssh");
  }

  function handleSsh(enable: boolean) {
    update({ ssh: enable });
    if (initialAuthKey) {
      void run(initialAuthKey);
    } else {
      setPhase("auth-method");
    }
  }

  function handleAuthMethod(value: string) {
    if (value === "key") {
      setPhase("auth-key");
    } else {
      void run(undefined);
    }
  }

  function handleAuthKey(value: string) {
    const key = value.trim();
    if (!key) return;
    void run(key);
  }

  // ─── Install + connect ────────────────────────────────────────────────────

  async function run(authKey: string | undefined) {
    const s = settingsRef.current as TailscaleSettings;
    try {
      setPhase("installing");
      const before = await getTailscaleStatus();
      if (before.installed) {
        addStep({ name: "Tailscale", status: "done", message: `Already installed${before.version ? ` (${before.version})` : ""}` });
        await ensureTailscaleDaemon();
      } else {
        await installTailscale();
        const after = await getTailscaleStatus();
        if (!after.installed) throw new Error("Tailscale installation failed");
        addStep({ name: "Tailscale", status: "done", message: `Installed${after.version ? ` (${after.version})` : ""}` });
      }

      if (s.advertiseRoutes.length > 0 || s.exitNode) {
        await enableIpForwarding();
        addStep({ name: "IP forwarding", status: "done", message: "Enabled (required for subnet routing)" });
      }

      setPhase("connecting");
      const status = await connectTailscale(s, {
        authKey,
        qr: Boolean(process.stdout.isTTY),
        onAuthUrl: (url, code) => {
          setAuthUrl(url);
          setQr(code);
        },
      });
      setAuthUrl(null);
      setQr(null);
      if (!status.connected) throw new Error(`Tailscale is not connected (state: ${status.backendState})`);
      addStep({
        name: "Connected",
        status: "done",
        message: `${status.dnsName ?? s.hostname}${status.ipv4 ? ` (${status.ipv4})` : ""}`,
      });

      // Route / exit node approval
      const wanted = [...s.advertiseRoutes];
      let stillPending = getPendingRoutes(status, wanted);
      const exitPending = s.exitNode && !status.exitNodeApproved;
      if ((stillPending.length > 0 || exitPending) && !autoYes) {
        setPending(stillPending);
        setPhase("approval");
        approvalAbort.current = new AbortController();
        stillPending = await waitForRouteApproval(wanted, { signal: approvalAbort.current.signal });
      }
      if (wanted.length > 0) {
        addStep(
          stillPending.length === 0
            ? { name: "Subnet route", status: "done", message: `${wanted.join(", ")} approved` }
            : { name: "Subnet route", status: "skipped", message: `Approve ${stillPending.join(", ")} in the admin console` },
        );
      }
      if (s.exitNode) {
        const final = await getTailscaleStatus();
        addStep(
          final.exitNodeApproved
            ? { name: "Exit node", status: "done", message: "Approved" }
            : { name: "Exit node", status: "skipped", message: "Approve in the admin console (Edit route settings)" },
        );
      }

      setPhase("finishing");
      const env = await loadEnvConfig();
      if (env.ENABLE_FIREWALL === "true" && (await isUfwActive())) {
        await allowTailscaleTraffic();
        addStep({ name: "Firewall", status: "done", message: "Allowed tailscale0 and UDP 41641" });
      }

      applyTailscaleSettingsToEnv(env, s, lan);
      await saveEnvConfig(env);
      const envUpdates: Partial<EnvConfig> = {
        ENABLE_TAILSCALE: env.ENABLE_TAILSCALE,
        TAILSCALE_HOSTNAME: env.TAILSCALE_HOSTNAME,
        TAILSCALE_ADVERTISE_ROUTES: env.TAILSCALE_ADVERTISE_ROUTES,
        TAILSCALE_EXIT_NODE: env.TAILSCALE_EXIT_NODE,
        TAILSCALE_SSH: env.TAILSCALE_SSH,
      };

      const finalStatus = await getTailscaleStatus();
      setPending(stillPending);
      setPhase("done");
      finish({ status: finalStatus, settings: s, pendingRoutes: stillPending, envUpdates });
    } catch (err) {
      fail(err);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Box flexDirection="column">
      {steps.map((step, i) => (
        <AppStatus key={i} name={step.name} status={step.status} message={step.message} />
      ))}

      {phase === "loading" && (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text> Detecting network...
        </Text>
      )}

      {phase === "hostname" && settings && (
        <Box flexDirection="column">
          <Text bold>Device name in your tailnet:</Text>
          <Text dimColor>  Used for MagicDNS, e.g. http://{settings.hostname}:8096 from any of your devices.</Text>
          <Box>
            <Text>  › </Text>
            <TextInput defaultValue={settings.hostname} placeholder={settings.hostname} onSubmit={handleHostname} />
          </Box>
        </Box>
      )}

      {phase === "routes" && (
        <Box flexDirection="column">
          <Text bold>
            Share your home network{lan ? <Text color="cyan"> {lan}</Text> : null} with your tailnet?
          </Text>
          <Text dimColor>  Makes this server a subnet router: the usual LAN URLs (http://&lt;LAN IP&gt;:&lt;port&gt;)</Text>
          <Text dimColor>  and other devices on your home network work remotely too.</Text>
          {!lan && <Text color="yellow">  Could not detect your LAN subnet — you'll be asked to enter it.</Text>}
          <Box>
            <Text>  Share? </Text>
            <ConfirmInput defaultChoice="confirm" onConfirm={() => handleRoutes(true)} onCancel={() => handleRoutes(false)} />
          </Box>
        </Box>
      )}

      {phase === "routes-custom" && (
        <Box flexDirection="column">
          <Text bold>Subnet(s) to share (comma-separated, e.g. 192.168.1.0/24):</Text>
          {routeInputError && <Text color="red">  {routeInputError}</Text>}
          <Box>
            <Text>  › </Text>
            <TextInput placeholder="192.168.1.0/24" onSubmit={handleCustomRoutes} />
          </Box>
        </Box>
      )}

      {phase === "exit-node" && (
        <Box flexDirection="column">
          <Text bold>Use this server as an exit node?</Text>
          <Text dimColor>  Lets your devices route all their internet traffic through your home connection,</Text>
          <Text dimColor>  e.g. to stay safe on public Wi-Fi. Optional — you can change this later.</Text>
          <Box>
            <Text>  Enable? </Text>
            <ConfirmInput defaultChoice="cancel" onConfirm={() => handleExitNode(true)} onCancel={() => handleExitNode(false)} />
          </Box>
        </Box>
      )}

      {phase === "ssh" && (
        <Box flexDirection="column">
          <Text bold>Enable Tailscale SSH?</Text>
          <Text dimColor>  SSH into this server over the tailnet, authenticated by your Tailscale identity</Text>
          <Text dimColor>  instead of SSH keys. Your regular SSH server keeps working as before.</Text>
          <Box>
            <Text>  Enable? </Text>
            <ConfirmInput defaultChoice="cancel" onConfirm={() => handleSsh(true)} onCancel={() => handleSsh(false)} />
          </Box>
        </Box>
      )}

      {phase === "auth-method" && (
        <Box flexDirection="column">
          <Text bold>How do you want to connect this server to Tailscale?</Text>
          <Box marginLeft={2}>
            <Select
              options={[
                { label: "Sign in with a browser (recommended)", value: "browser" },
                { label: "Use an auth key", value: "key" },
              ]}
              onChange={handleAuthMethod}
            />
          </Box>
        </Box>
      )}

      {phase === "auth-key" && (
        <Box flexDirection="column">
          <Text bold>Paste your Tailscale auth key:</Text>
          <Text dimColor>  Generate one at <Link url={TAILSCALE_KEYS_URL}>{TAILSCALE_KEYS_URL}</Link></Text>
          <Text dimColor>  Tip: a tagged, pre-approved key means the device never expires.</Text>
          <Box>
            <Text>  › </Text>
            <PasswordInput placeholder="tskey-auth-..." onSubmit={handleAuthKey} />
          </Box>
        </Box>
      )}

      {phase === "installing" && (
        <Text>
          <Text color="yellow"><Spinner type="dots" /></Text> Installing and starting Tailscale...
        </Text>
      )}

      {phase === "connecting" && !authUrl && (
        <Text>
          <Text color="yellow"><Spinner type="dots" /></Text> Connecting to Tailscale...
        </Text>
      )}

      {phase === "connecting" && authUrl && (
        <Box flexDirection="column">
          <Text bold>Sign in to connect this server to your tailnet:</Text>
          <Text>
            {"  "}
            <Link url={authUrl}>
              <Text color="cyan">{authUrl}</Text>
            </Link>
          </Text>
          {qr && (
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>  Or scan with your phone:</Text>
              <Text>{qr}</Text>
            </Box>
          )}
          <Text>
            <Text color="yellow"><Spinner type="dots" /></Text> Waiting for sign-in...
          </Text>
        </Box>
      )}

      {phase === "approval" && (
        <Box flexDirection="column">
          <Text bold color="yellow">Approve the advertised routes for this device:</Text>
          <Text>  1. Open <Link url={TAILSCALE_ADMIN_URL}><Text color="cyan">{TAILSCALE_ADMIN_URL}</Text></Link></Text>
          <Text>  2. Click the "…" menu next to <Text bold>{settings?.hostname}</Text> → Edit route settings</Text>
          <Text>  3. Tick {pending.length > 0 ? pending.join(", ") : "the subnet"}{settings?.exitNode ? " and \"Use as exit node\"" : ""}, then Save</Text>
          <Text>
            <Text color="yellow"><Spinner type="dots" /></Text> Waiting for approval... <Text dimColor>(press Enter to skip)</Text>
          </Text>
        </Box>
      )}

      {phase === "finishing" && (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text> Saving configuration...
        </Text>
      )}

      {phase === "error" && error && (
        <AppStatus name="Tailscale" status="error" message={error} />
      )}
    </Box>
  );
}

/** Post-setup notes shared by the install command and the setup summary */
export function TailscaleNotes({ status, pendingRoutes }: { status: TailscaleStatus; pendingRoutes: string[] }) {
  const expiryDays = daysUntilKeyExpiry(status);
  return (
    <Box flexDirection="column">
      <Text>  Install Tailscale on your phone/laptop and sign in with the same account:</Text>
      <Text>    <Link url={TAILSCALE_DOWNLOAD_URL}><Text color="cyan">{TAILSCALE_DOWNLOAD_URL}</Text></Link></Text>
      {status.dnsName && <Text>  This server: <Text color="cyan">{status.dnsName}</Text>{status.ipv4 ? ` (${status.ipv4})` : ""}</Text>}
      {pendingRoutes.length > 0 && (
        <Text color="yellow">  Remember to approve {pendingRoutes.join(", ")} at {TAILSCALE_ADMIN_URL}</Text>
      )}
      {expiryDays !== null && (
        <Text color="yellow">
          {"  "}The device key expires in {expiryDays} days. Disable key expiry for this machine at {TAILSCALE_ADMIN_URL}
        </Text>
      )}
    </Box>
  );
}

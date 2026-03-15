import { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { TextInput, PasswordInput, ConfirmInput, Select } from "@inkjs/ui";
import { StatusMessage } from "@inkjs/ui";
import { loadEnvConfig, saveEnvConfig, getBackupConfig } from "@/lib/config.js";
import {
  isRcloneInstalled,
  isRcloneRemoteConfigured,
  isRemoteReachable,
  createRemote,
  deleteRemote,
  getRemoteType,
  obscurePassword,
} from "@/lib/rclone.js";
import { Header } from "@/components/Header.js";
import { AppStatus } from "@/components/AppStatus.js";
import type { EnvConfig } from "@/types.js";

// ─── Provider definitions ────────────────────────────────────────────────────

interface ProviderField {
  key: string;
  label: string;
  sensitive?: boolean;
  default?: string;
  required?: boolean;
}

interface Provider {
  name: string;
  rcloneType: string;
  defaultRemoteName: string;
  fields: ProviderField[];
  oauth?: boolean;
  notes?: string[];
}

const PROVIDERS: Provider[] = [
  {
    name: "Google Drive",
    rcloneType: "drive",
    defaultRemoteName: "gdrive",
    oauth: true,
    fields: [
      { key: "client_id", label: "Client ID (from Google API Console)", required: true },
      { key: "client_secret", label: "Client secret", sensitive: true, required: true },
      { key: "token", label: "OAuth token (from rclone authorize)", sensitive: true, required: true },
    ],
    notes: [
      "Get a client ID: https://rclone.org/drive/#making-your-own-client-id",
      "On a machine with a browser, run: rclone authorize \"drive\" \"<client_id>\" \"<client_secret>\"",
      "Paste the resulting token JSON when prompted.",
    ],
  },
  {
    name: "SFTP",
    rcloneType: "sftp",
    defaultRemoteName: "my-sftp",
    fields: [
      { key: "host", label: "Hostname or IP", required: true },
      { key: "user", label: "SSH username", required: true },
      { key: "port", label: "SSH port", default: "22" },
      { key: "key_file", label: "Path to SSH private key (leave empty for password auth)" },
      { key: "pass", label: "SSH password (if not using key auth)", sensitive: true },
    ],
  },
  {
    name: "S3",
    rcloneType: "s3",
    defaultRemoteName: "my-s3",
    fields: [
      { key: "provider", label: "S3 provider (AWS, Minio, Wasabi, etc.)", required: true, default: "AWS" },
      { key: "access_key_id", label: "Access key ID", required: true },
      { key: "secret_access_key", label: "Secret access key", sensitive: true, required: true },
      { key: "region", label: "Region (e.g. us-east-1)", default: "us-east-1" },
      { key: "endpoint", label: "Endpoint URL (for non-AWS, e.g. Minio)" },
    ],
  },
  {
    name: "Dropbox",
    rcloneType: "dropbox",
    defaultRemoteName: "my-dropbox",
    oauth: true,
    fields: [
      { key: "client_id", label: "App key (from Dropbox App Console)", required: true },
      { key: "client_secret", label: "App secret", sensitive: true, required: true },
      { key: "token", label: "OAuth token (from rclone authorize)", sensitive: true, required: true },
    ],
    notes: [
      "Create an app at: https://www.dropbox.com/developers/apps",
      "On a machine with a browser, run: rclone authorize \"dropbox\" \"<client_id>\" \"<client_secret>\"",
      "Paste the resulting token JSON when prompted.",
    ],
  },
  {
    name: "OneDrive",
    rcloneType: "onedrive",
    defaultRemoteName: "my-onedrive",
    oauth: true,
    fields: [
      { key: "client_id", label: "Application (client) ID", required: true },
      { key: "client_secret", label: "Client secret", sensitive: true, required: true },
      { key: "token", label: "OAuth token (from rclone authorize)", sensitive: true, required: true },
    ],
    notes: [
      "Register an app at: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps",
      "On a machine with a browser, run: rclone authorize \"onedrive\" \"<client_id>\" \"<client_secret>\"",
      "Paste the resulting token JSON when prompted.",
    ],
  },
  {
    name: "iCloud Drive",
    rcloneType: "iclouddrive",
    defaultRemoteName: "my-icloud",
    fields: [
      { key: "apple_id", label: "Apple ID (email)", required: true },
      { key: "password", label: "App-specific password", sensitive: true, required: true },
    ],
    notes: [
      "EXPERIMENTAL: iCloud Drive support is experimental in rclone.",
      "Generate an app-specific password at: https://appleid.apple.com",
      "Trust tokens expire after ~30 days — you may need to re-authenticate.",
      "Advanced Data Protection (ADP) is not supported.",
    ],
  },
];

// ─── Add Remote wizard ──────────────────────────────────────────────────────

type AddStep = "select-provider" | "enter-name" | "enter-fields" | "creating" | "testing" | "done";

function AddRemoteCommand() {
  const { exit } = useApp();
  const [step, setStep] = useState<AddStep>("select-provider");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [remoteName, setRemoteName] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [currentFieldIdx, setCurrentFieldIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  function handleProviderSelect(value: string) {
    const p = PROVIDERS.find((p) => p.rcloneType === value);
    if (p) {
      setProvider(p);
      setRemoteName(p.defaultRemoteName);
      setStep("enter-name");
    }
  }

  function handleNameSubmit(value: string) {
    const name = value.trim();
    if (!name) {
      setError("Remote name cannot be empty");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      setError("Remote name can only contain letters, numbers, hyphens, and underscores");
      return;
    }
    setError(null);
    setRemoteName(name);
    setCurrentFieldIdx(0);
    setFieldValues({});
    setStep("enter-fields");
  }

  function handleFieldSubmit(value: string) {
    if (!provider) return;
    const field = provider.fields[currentFieldIdx];
    const trimmed = value.trim();

    // Use default if empty and default exists
    const resolvedValue = trimmed || field.default || "";

    if (field.required && !resolvedValue) {
      setError(`${field.label} is required`);
      return;
    }

    setError(null);
    const updated = { ...fieldValues, [field.key]: resolvedValue };
    setFieldValues(updated);

    if (currentFieldIdx < provider.fields.length - 1) {
      setCurrentFieldIdx(currentFieldIdx + 1);
    } else {
      doCreate(updated);
    }
  }

  async function doCreate(params: Record<string, string>) {
    if (!provider) return;
    setStep("creating");
    try {
      // For iCloud Drive, obscure the password
      const finalParams = { ...params };
      if (provider.rcloneType === "iclouddrive" && finalParams.password) {
        finalParams.password = await obscurePassword(finalParams.password);
      }

      // Filter out empty values
      const filtered: Record<string, string> = {};
      for (const [k, v] of Object.entries(finalParams)) {
        if (v) filtered[k] = v;
      }

      await createRemote(remoteName, provider.rcloneType, filtered);

      // Test connectivity
      setStep("testing");
      const reachable = await isRemoteReachable(remoteName);
      if (reachable) {
        setTestResult("Connected successfully");
      } else {
        setTestResult("Remote created but connectivity test failed — check your credentials");
      }

      // Add to RCLONE_REMOTES in .env
      const env = await loadEnvConfig();
      const config = getBackupConfig(env);
      const currentRemotes = config.RCLONE_REMOTES;
      if (!currentRemotes.includes(remoteName)) {
        const newRemotes = [...currentRemotes, remoteName].join(",");
        env.RCLONE_REMOTES = newRemotes;
        // Remove legacy RCLONE_REMOTE if we're now using RCLONE_REMOTES
        delete env.RCLONE_REMOTE;
        await saveEnvConfig(env);
      }

      setStep("done");
      setTimeout(() => exit(), 1000);
    } catch (err: any) {
      setError(`Failed to create remote: ${err.message}`);
      setStep("done");
      setTimeout(() => exit(), 1000);
    }
  }

  if (step === "select-provider") {
    return (
      <Box flexDirection="column">
        <Header title="Add Backup Remote" />
        <Text bold>  Select a storage provider:</Text>
        <Box marginLeft={2}>
          <Select
            options={PROVIDERS.map((p) => ({
              label: p.name,
              value: p.rcloneType,
            }))}
            onChange={handleProviderSelect}
          />
        </Box>
      </Box>
    );
  }

  if (step === "enter-name") {
    return (
      <Box flexDirection="column">
        <Header title="Add Backup Remote" />
        <AppStatus name="Provider" status="done" message={provider!.name} />

        {/* Show notes for OAuth providers */}
        {provider?.notes && (
          <Box flexDirection="column" marginTop={1} marginBottom={1}>
            {provider.notes.map((note, i) => (
              <Text key={i} dimColor>  {note}</Text>
            ))}
          </Box>
        )}

        {provider?.oauth && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color="yellow">  Note: If this server has no browser, run the rclone authorize</Text>
            <Text color="yellow">  command on another machine, then paste the token here.</Text>
          </Box>
        )}

        <Text bold>  Remote name:</Text>
        {error && <Text color="red">  {error}</Text>}
        <Box>
          <Text color="blue">{"  > "}</Text>
          <TextInput defaultValue={remoteName} onSubmit={handleNameSubmit} />
        </Box>
      </Box>
    );
  }

  if (step === "enter-fields" && provider) {
    const currentField = provider.fields[currentFieldIdx];
    const defaultHint = currentField.default ? ` (default: ${currentField.default})` : "";

    return (
      <Box flexDirection="column">
        <Header title="Add Backup Remote" />
        <AppStatus name="Provider" status="done" message={provider.name} />
        <AppStatus name="Remote name" status="done" message={remoteName} />

        {/* Completed fields */}
        {provider.fields.slice(0, currentFieldIdx).map((f) => (
          <AppStatus
            key={f.key}
            name={f.label}
            status="done"
            message={f.sensitive ? "****" : fieldValues[f.key]}
          />
        ))}

        <Box flexDirection="column" marginTop={1}>
          <Text bold>  {currentField.label}{defaultHint}</Text>
          {error && <Text color="red">  {error}</Text>}
          <Box>
            <Text color="blue">{"  > "}</Text>
            {currentField.sensitive ? (
              <PasswordInput key={currentField.key} onSubmit={handleFieldSubmit} />
            ) : (
              <TextInput
                key={currentField.key}
                defaultValue={currentField.default ?? ""}
                onSubmit={handleFieldSubmit}
              />
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  if (step === "creating") {
    return (
      <Box flexDirection="column">
        <Header title="Add Backup Remote" />
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Creating remote '{remoteName}'...
        </Text>
      </Box>
    );
  }

  if (step === "testing") {
    return (
      <Box flexDirection="column">
        <Header title="Add Backup Remote" />
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Testing connectivity to '{remoteName}'...
        </Text>
      </Box>
    );
  }

  // done
  return (
    <Box flexDirection="column">
      <Header title="Add Backup Remote" />
      {error ? (
        <StatusMessage variant="error">{error}</StatusMessage>
      ) : (
        <>
          <StatusMessage variant="success">
            Remote '{remoteName}' created and added to RCLONE_REMOTES
          </StatusMessage>
          {testResult && (
            <Text dimColor>  {testResult}</Text>
          )}
        </>
      )}
    </Box>
  );
}

// ─── List Remotes ────────────────────────────────────────────────────────────

function ListRemotesCommand() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"loading" | "done">("loading");
  const [remotes, setRemotes] = useState<
    { name: string; type: string | null; reachable: boolean | null }[]
  >([]);

  useEffect(() => {
    loadRemotes();
  }, []);

  async function loadRemotes() {
    const env = await loadEnvConfig();
    const config = getBackupConfig(env);
    const results: typeof remotes = [];

    for (const name of config.RCLONE_REMOTES) {
      const type = await getRemoteType(name);
      let reachable: boolean | null = null;
      const check = await isRcloneRemoteConfigured(name);
      if (check.configured) {
        reachable = await isRemoteReachable(name);
      }
      results.push({ name, type, reachable });
    }

    setRemotes(results);
    setPhase("done");
    setTimeout(() => exit(), 100);
  }

  if (phase === "loading") {
    return (
      <Box flexDirection="column">
        <Header title="Backup Remotes" />
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Checking configured remotes...
        </Text>
      </Box>
    );
  }

  if (remotes.length === 0) {
    return (
      <Box flexDirection="column">
        <Header title="Backup Remotes" />
        <Text dimColor>  No remotes configured. Run 'mithrandir backup remote add' to add one.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header title="Backup Remotes" />
      {remotes.map((r) => {
        const status = r.reachable === true ? "done" : r.reachable === false ? "error" : "skipped";
        const statusMsg = r.reachable === true
          ? "reachable"
          : r.reachable === false
            ? "unreachable"
            : "not configured";
        return (
          <AppStatus
            key={r.name}
            name={r.name}
            status={status}
            message={`${r.type ?? "unknown"} — ${statusMsg}`}
          />
        );
      })}
    </Box>
  );
}

// ─── Remove Remote ───────────────────────────────────────────────────────────

function RemoveRemoteCommand({ remoteName }: { remoteName: string }) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<"confirm" | "confirm-rclone" | "removing" | "done">("confirm");
  const [deleteFromRclone, setDeleteFromRclone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doRemove() {
    setPhase("removing");
    try {
      // Remove from .env RCLONE_REMOTES
      const env = await loadEnvConfig();
      const config = getBackupConfig(env);
      const newRemotes = config.RCLONE_REMOTES.filter((r) => r !== remoteName);
      if (newRemotes.length > 0) {
        env.RCLONE_REMOTES = newRemotes.join(",");
      } else {
        delete env.RCLONE_REMOTES;
      }
      // Remove legacy RCLONE_REMOTE if it matches
      if (env.RCLONE_REMOTE === remoteName) {
        delete env.RCLONE_REMOTE;
      }
      await saveEnvConfig(env);

      // Optionally remove from rclone.conf
      if (deleteFromRclone) {
        try {
          await deleteRemote(remoteName);
        } catch {
          // Ignore errors deleting from rclone.conf
        }
      }

      setPhase("done");
      setTimeout(() => exit(), 500);
    } catch (err: any) {
      setError(err.message);
      setPhase("done");
      setTimeout(() => exit(), 500);
    }
  }

  return (
    <Box flexDirection="column">
      <Header title="Remove Backup Remote" />

      {phase === "confirm" && (
        <Box flexDirection="column">
          <Text>Remove '{remoteName}' from RCLONE_REMOTES in .env?</Text>
          <ConfirmInput
            onConfirm={() => setPhase("confirm-rclone")}
            onCancel={() => exit()}
          />
        </Box>
      )}

      {phase === "confirm-rclone" && (
        <Box flexDirection="column">
          <Text>Also delete '{remoteName}' from rclone.conf?</Text>
          <ConfirmInput
            onConfirm={() => {
              setDeleteFromRclone(true);
              doRemove();
            }}
            onCancel={() => {
              setDeleteFromRclone(false);
              doRemove();
            }}
          />
        </Box>
      )}

      {phase === "removing" && (
        <Text>
          <Text color="green"><Spinner type="dots" /></Text>
          {" "}Removing '{remoteName}'...
        </Text>
      )}

      {phase === "done" && (
        error ? (
          <StatusMessage variant="error">{error}</StatusMessage>
        ) : (
          <StatusMessage variant="success">
            Remote '{remoteName}' removed{deleteFromRclone ? " from .env and rclone.conf" : " from .env"}
          </StatusMessage>
        )
      )}
    </Box>
  );
}

// ─── Entry points ────────────────────────────────────────────────────────────

export async function runBackupRemoteAdd(): Promise<void> {
  if (!(await isRcloneInstalled())) {
    console.error("rclone is not installed. Run 'mithrandir install backup' first.");
    process.exit(1);
  }
  const { waitUntilExit } = render(<AddRemoteCommand />);
  await waitUntilExit();
}

export async function runBackupRemoteList(): Promise<void> {
  const { waitUntilExit } = render(<ListRemotesCommand />);
  await waitUntilExit();
}

export async function runBackupRemoteRemove(args: string[]): Promise<void> {
  const remoteName = args[0];
  if (!remoteName) {
    console.error("Usage: mithrandir backup remote remove <name>");
    process.exit(1);
  }

  // Check if remote is in config
  const env = await loadEnvConfig();
  const config = getBackupConfig(env);
  if (!config.RCLONE_REMOTES.includes(remoteName)) {
    console.error(`Remote '${remoteName}' is not in RCLONE_REMOTES.`);
    console.error(`Configured remotes: ${config.RCLONE_REMOTES.join(", ")}`);
    process.exit(1);
  }

  const { waitUntilExit } = render(<RemoveRemoteCommand remoteName={remoteName} />);
  await waitUntilExit();
}

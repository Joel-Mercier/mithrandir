import { useEffect, useState } from "react";
import { Box, render, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { ConfirmInput, PasswordInput, StatusMessage, TextInput } from "@inkjs/ui";
import { Header } from "@/components/Header.js";
import { loadEnvConfig } from "@/lib/config.js";
import {
  applyMediaDownloadSettings,
  connectQbittorrent,
  formatBytes,
  inspectMediaDownloads,
  isMediaStackInstalled,
  pruneDownloads,
  scanDownloads,
  type ApplyMediaSettingsResult,
  type DownloadOrphanItem,
  type DownloadsScan,
  type DownloadTorrentItem,
  type MediaDownloadsStatus,
  type MediaSettingsIssue,
  type PruneResult,
} from "@/lib/media-downloads.js";

// ─── Shared bits ─────────────────────────────────────────────────────────────

function Loading({ label }: { label: string }) {
  return (
    <Text>
      <Text color="green">
        <Spinner type="dots" />
      </Text>{" "}
      {label}
    </Text>
  );
}

function IssueList({ issues }: { issues: MediaSettingsIssue[] }) {
  if (issues.length === 0) {
    return <Text color="green">✔ All download settings are as recommended</Text>;
  }
  return (
    <Box flexDirection="column">
      {issues.map((issue, i) => (
        <Text key={i}>
          <Text color={issue.severity === "fail" ? "red" : issue.severity === "warn" ? "yellow" : "gray"}>
            {issue.severity === "fail" ? "✘" : issue.severity === "warn" ? "!" : "i"}
          </Text>{" "}
          <Text bold>{issue.app}</Text>: {issue.message}
          {issue.fixable ? <Text dimColor> (fixable)</Text> : null}
        </Text>
      ))}
    </Box>
  );
}

function exitSoon(exit: () => void) {
  const t = setTimeout(() => exit(), 100);
  t.unref();
}

function scanSummary(scan: DownloadsScan): string {
  return `${scan.torrents.length} torrent(s) and ${scan.orphans.length} leftover item(s), ${formatBytes(scan.reclaimableBytes)} reclaimable`;
}

// ─── mithrandir media ────────────────────────────────────────────────────────

function MediaStatus() {
  const { exit } = useApp();
  const [status, setStatus] = useState<MediaDownloadsStatus | null>(null);
  const [scan, setScan] = useState<DownloadsScan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const env = await loadEnvConfig();
        const s = await inspectMediaDownloads(env);
        setStatus(s);
        if (s.relevant && s.qbittorrent.reachable) setScan(await scanDownloads(env));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
      exitSoon(exit);
    })();
  }, []);

  if (error) return <StatusMessage variant="error">{error}</StatusMessage>;
  if (!status) {
    return (
      <Box flexDirection="column">
        <Header title="Media Downloads" />
        <Loading label="Checking qBittorrent and *arr settings..." />
      </Box>
    );
  }
  if (!status.relevant) {
    return (
      <Box flexDirection="column">
        <Header title="Media Downloads" />
        <Text dimColor>qBittorrent and at least one of Radarr/Sonarr/Lidarr must be installed.</Text>
      </Box>
    );
  }

  const fixable = status.issues.some((i) => i.fixable);
  return (
    <Box flexDirection="column">
      <Header title="Media Downloads" />
      <Text bold>Settings</Text>
      <IssueList issues={status.issues} />
      {fixable && (
        <Text dimColor>
          Run <Text color="cyan">mithrandir media fix</Text> to apply the recommended settings.
        </Text>
      )}
      {scan && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Disk usage</Text>
          {scan.error ? (
            <Text color="yellow">{scan.error}</Text>
          ) : (
            <>
              <Text>
                {scan.healthyCount} download(s) in use by the library. Not in use: {scanSummary(scan)}.
              </Text>
              {scan.torrents.length + scan.orphans.length > 0 && (
                <Text dimColor>
                  Review and delete them with <Text color="cyan">mithrandir media prune</Text>.
                </Text>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── mithrandir media fix ────────────────────────────────────────────────────

type FixPhase = "checking" | "ask-username" | "ask-password" | "applying" | "done";

function MediaFix() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<FixPhase>("checking");
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<ApplyMediaSettingsResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const env = await loadEnvConfig();
        if (!isMediaStackInstalled(env.BASE_DIR)) {
          fail(new Error("qBittorrent and at least one of Radarr/Sonarr/Lidarr must be installed."));
          return;
        }
        const qbit = await connectQbittorrent(env);
        if (!qbit.client && process.stdin.isTTY && !/unreachable/.test(qbit.error ?? "")) {
          setNotice(qbit.error ?? null);
          setPhase("ask-username");
          return;
        }
        await apply();
      } catch (err) {
        fail(err);
      }
    })();
  }, []);

  function fail(err: unknown) {
    setError(err instanceof Error ? err.message : String(err));
    exitSoon(exit);
  }

  async function apply(credentials?: { username: string; password: string }) {
    setPhase("applying");
    try {
      const env = await loadEnvConfig();
      setResult(await applyMediaDownloadSettings(env, { credentials }));
      setPhase("done");
    } catch (err) {
      fail(err);
      return;
    }
    exitSoon(exit);
  }

  if (error) return <StatusMessage variant="error">{error}</StatusMessage>;

  return (
    <Box flexDirection="column">
      <Header title="Media Downloads — Fix" />
      {phase === "checking" && <Loading label="Connecting to qBittorrent..." />}
      {(phase === "ask-username" || phase === "ask-password") && (
        <Box flexDirection="column">
          {notice && <Text color="yellow">{notice}</Text>}
          <Text dimColor>Enter the qBittorrent WebUI login (it is saved to .env for automatic cleanup).</Text>
          {phase === "ask-username" ? (
            <Box>
              <Text>Username: </Text>
              <TextInput
                placeholder="admin"
                onSubmit={(v) => {
                  setUsername(v.trim() || "admin");
                  setPhase("ask-password");
                }}
              />
            </Box>
          ) : (
            <Box>
              <Text>Password: </Text>
              <PasswordInput onSubmit={(v) => apply({ username, password: v })} />
            </Box>
          )}
        </Box>
      )}
      {phase === "applying" && <Loading label="Applying recommended settings..." />}
      {phase === "done" && result && (
        <Box flexDirection="column">
          {result.steps.length === 0 && <Text dimColor>Nothing to change.</Text>}
          {result.steps.map((s, i) => (
            <Text key={i}>
              <Text color={s.ok ? "green" : "red"}>{s.ok ? "✔" : "✘"}</Text> <Text bold>{s.app}</Text>: {s.message}
              {s.error ? <Text color="red"> — {s.error}</Text> : null}
            </Text>
          ))}
          <Box marginTop={1} flexDirection="column">
            {result.remaining.length > 0 ? (
              <>
                <Text bold>Still needs attention</Text>
                <IssueList issues={result.remaining} />
              </>
            ) : (
              <Text color="green">✔ Deleting a movie, series or album in Radarr/Sonarr/Lidarr now frees its download too.</Text>
            )}
          </Box>
          <Text dimColor>No downloads were deleted. Review leftovers with `mithrandir media prune`.</Text>
        </Box>
      )}
    </Box>
  );
}

// ─── mithrandir media prune ──────────────────────────────────────────────────

interface PruneGroup {
  key: string;
  title: string;
  description: string;
  /** Selected automatically with --yes */
  safe: boolean;
  torrents: DownloadTorrentItem[];
  orphans: DownloadOrphanItem[];
}

function buildGroups(scan: DownloadsScan): PruneGroup[] {
  const groups: PruneGroup[] = [
    {
      key: "deleted",
      title: "Deleted from the library",
      description: "Torrents whose files were deleted in Radarr/Sonarr/Lidarr. Removing them stops seeding and frees the space.",
      safe: true,
      torrents: scan.torrents.filter((t) => t.group === "deleted"),
      orphans: [],
    },
    {
      key: "orphans-unlinked",
      title: "Leftover files not in the library",
      description: "Files in the downloads folder that no torrent and no library item uses.",
      safe: true,
      torrents: [],
      orphans: scan.orphans.filter((o) => !o.linked),
    },
    {
      key: "orphans-linked",
      title: "Leftover files still in the library",
      description: "No torrent uses them, but the library shares the data. Removing them frees nothing now; deleting the library item later will.",
      safe: true,
      torrents: [],
      orphans: scan.orphans.filter((o) => o.linked),
    },
    {
      key: "partial",
      title: "Partly deleted packs",
      description: "Some files of these packs were deleted from the library, others are still used. Removing the torrent only frees the deleted part and stops seeding the whole pack.",
      safe: false,
      torrents: scan.torrents.filter((t) => t.group === "partial"),
      orphans: [],
    },
    {
      key: "not-imported",
      title: "Never imported",
      description: "Completed downloads that were never added to the library (wrong match, manual download...).",
      safe: false,
      torrents: scan.torrents.filter((t) => t.group === "not-imported"),
      orphans: [],
    },
  ];
  return groups.filter((g) => g.torrents.length + g.orphans.length > 0);
}

function groupBytes(g: PruneGroup): number {
  return [...g.torrents, ...g.orphans].reduce((s, i) => s + i.reclaimableBytes, 0);
}

const MAX_LISTED = 15;

function GroupDetails({ group }: { group: PruneGroup }) {
  const items = [
    ...group.torrents.map((t) => ({
      label: t.name,
      detail: t.group === "partial" ? `${t.linkedMediaFiles}/${t.mediaFiles} files still in library` : t.category,
      bytes: t.reclaimableBytes,
    })),
    ...group.orphans.map((o) => ({ label: o.relativePath, detail: "", bytes: o.linked ? o.totalBytes : o.reclaimableBytes })),
  ];
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="cyan">
        {group.title} — {items.length} item(s), {formatBytes(groupBytes(group))} freed
      </Text>
      <Text dimColor>{group.description}</Text>
      {items.slice(0, MAX_LISTED).map((item, i) => (
        <Text key={i}>
          {"  "}• {item.label} <Text dimColor>({formatBytes(item.bytes)}{item.detail ? `, ${item.detail}` : ""})</Text>
        </Text>
      ))}
      {items.length > MAX_LISTED && <Text dimColor>{"  "}… and {items.length - MAX_LISTED} more</Text>}
    </Box>
  );
}

function MediaPrune({ yes }: { yes: boolean }) {
  const { exit } = useApp();
  const [groups, setGroups] = useState<PruneGroup[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<PruneGroup[]>([]);
  const [phase, setPhase] = useState<"scanning" | "confirm" | "deleting" | "done">("scanning");
  const [result, setResult] = useState<PruneResult | null>(null);
  const [skipped, setSkipped] = useState<PruneGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const env = await loadEnvConfig();
        const scan = await scanDownloads(env);
        if (scan.error) throw new Error(scan.error);
        const g = buildGroups(scan);
        setGroups(g);
        if (g.length === 0) {
          setPhase("done");
          exitSoon(exit);
          return;
        }
        if (yes || !process.stdin.isTTY) {
          const chosen = yes ? g.filter((x) => x.safe) : [];
          setSkipped(g.filter((x) => !chosen.includes(x)));
          await run(chosen);
          return;
        }
        setPhase("confirm");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        exitSoon(exit);
      }
    })();
  }, []);

  function answer(take: boolean) {
    const group = groups![index];
    const nextSelected = take ? [...selected, group] : selected;
    if (!take) setSkipped((s) => [...s, group]);
    setSelected(nextSelected);
    if (index + 1 < groups!.length) setIndex(index + 1);
    else run(nextSelected);
  }

  async function run(chosen: PruneGroup[]) {
    if (chosen.length === 0) {
      setPhase("done");
      exitSoon(exit);
      return;
    }
    setPhase("deleting");
    try {
      const env = await loadEnvConfig();
      const res = await pruneDownloads(
        env,
        {
          hashes: chosen.flatMap((g) => g.torrents.map((t) => t.hash)),
          orphanPaths: chosen.flatMap((g) => g.orphans.map((o) => o.path)),
        },
        { sudoFallback: true },
      );
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setPhase("done");
    exitSoon(exit);
  }

  if (error) return <StatusMessage variant="error">{error}</StatusMessage>;

  return (
    <Box flexDirection="column">
      <Header title="Media Downloads — Prune" />
      {phase === "scanning" && <Loading label="Scanning downloads (hardlinks)..." />}
      {phase === "confirm" && groups && (
        <Box flexDirection="column">
          <GroupDetails group={groups[index]} />
          <Box marginTop={1}>
            <Text>
              Delete these {groups[index].torrents.length > 0 ? "torrents and their files" : "files"}? (y/N){" "}
            </Text>
            <ConfirmInput
              key={index}
              defaultChoice="cancel"
              onConfirm={() => answer(true)}
              onCancel={() => answer(false)}
            />
          </Box>
        </Box>
      )}
      {phase === "deleting" && <Loading label="Deleting..." />}
      {phase === "done" && (
        <Box flexDirection="column">
          {groups?.length === 0 && <Text color="green">✔ Nothing to clean up: every download is in use by the library.</Text>}
          {result && (
            <>
              <Text color="green">
                ✔ Removed {result.removedTorrents.length} torrent(s) and {result.deletedOrphans.length} leftover item(s),{" "}
                {formatBytes(result.freedBytes)} freed
              </Text>
              {result.removedDirs.map((d) => (
                <Text key={d} dimColor>
                  Removed empty folder {d}
                </Text>
              ))}
              {result.failed.map((f, i) => (
                <Text key={i} color="red">
                  ✘ {f.target}: {f.error}
                </Text>
              ))}
            </>
          )}
          {skipped.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>Kept:</Text>
              {skipped.map((g) => (
                <Text key={g.key} dimColor>
                  {"  "}• {g.title} ({g.torrents.length + g.orphans.length} item(s), {formatBytes(groupBytes(g))})
                  {yes && !g.safe ? " — needs an interactive confirmation" : ""}
                </Text>
              ))}
            </Box>
          )}
          {!result && groups && groups.length > 0 && <Text>Nothing deleted.</Text>}
        </Box>
      )}
    </Box>
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runMedia(args: string[], flags: { yes?: boolean }): Promise<void> {
  const sub = args[0];
  let app;
  if (!sub || sub === "status") app = render(<MediaStatus />);
  else if (sub === "fix") app = render(<MediaFix />);
  else if (sub === "prune") app = render(<MediaPrune yes={!!flags.yes} />);
  else {
    console.error(`Unknown media command: ${sub}\nUsage: mithrandir media [status|fix|prune [--yes]]`);
    process.exit(1);
  }
  await app.waitUntilExit();
}

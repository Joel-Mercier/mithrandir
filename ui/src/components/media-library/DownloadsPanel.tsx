import type {
	DownloadOrphanItem,
	DownloadTorrentItem,
	MediaSettingsIssue,
} from "@mithrandir/cli/lib/media-downloads";
import {
	AlertTriangle,
	CheckCircle2,
	Download,
	Info,
	Loader2,
	RefreshCw,
	Trash2,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "#/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Skeleton } from "#/components/ui/skeleton";
import {
	useFixMediaDownloads,
	useMediaDownloads,
	usePruneMediaDownloads,
} from "#/hooks/homelab";
import { formatFileSize } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

/** A selectable leftover: either a qBittorrent torrent or an untracked path */
interface Item {
	key: string;
	kind: "torrent" | "orphan";
	id: string;
	name: string;
	detail: string;
	reclaimableBytes: number;
}

interface Group {
	id: string;
	title: string;
	description: string;
	/** Unsafe groups (data still used, or never imported) are highlighted */
	caution: boolean;
	items: Item[];
}

function torrentItem(t: DownloadTorrentItem): Item {
	return {
		key: `t:${t.hash}`,
		kind: "torrent",
		id: t.hash,
		name: t.name,
		detail:
			t.mediaFiles > 0
				? `${t.category} · ${t.linkedMediaFiles}/${t.mediaFiles}`
				: t.category,
		reclaimableBytes: t.reclaimableBytes,
	};
}

function orphanItem(o: DownloadOrphanItem): Item {
	return {
		key: `o:${o.path}`,
		kind: "orphan",
		id: o.path,
		name: o.relativePath,
		detail: formatFileSize(o.totalBytes),
		reclaimableBytes: o.reclaimableBytes,
	};
}

function IssueRow({ issue }: { issue: MediaSettingsIssue }) {
	const Icon =
		issue.severity === "fail"
			? XCircle
			: issue.severity === "warn"
				? AlertTriangle
				: Info;
	const color =
		issue.severity === "fail"
			? "text-destructive"
			: issue.severity === "warn"
				? "text-amber-500"
				: "text-muted-foreground";
	return (
		<li className="flex items-start gap-2 text-sm">
			<Icon className={`mt-0.5 size-4 shrink-0 ${color}`} />
			<span>
				<span className="font-medium">{issue.app}</span>
				<span className="text-muted-foreground"> · {issue.message}</span>
			</span>
		</li>
	);
}

export default function DownloadsPanel() {
	const { data, isPending, isError, refetch, isFetching } = useMediaDownloads();
	const fix = useFixMediaDownloads();
	const prune = usePruneMediaDownloads();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [confirmOpen, setConfirmOpen] = useState(false);

	const groups = useMemo<Group[]>(() => {
		const scan = data?.scan;
		if (!scan) return [];
		const byGroup = (g: DownloadTorrentItem["group"]) =>
			scan.torrents.filter((t) => t.group === g).map(torrentItem);
		const all: Group[] = [
			{
				id: "deleted",
				title: m.downloads_group_deleted(),
				description: m.downloads_group_deletedDesc(),
				caution: false,
				items: byGroup("deleted"),
			},
			{
				id: "orphans",
				title: m.downloads_group_orphans(),
				description: m.downloads_group_orphansDesc(),
				caution: false,
				items: scan.orphans.filter((o) => !o.linked).map(orphanItem),
			},
			{
				id: "orphans-linked",
				title: m.downloads_group_orphansLinked(),
				description: m.downloads_group_orphansLinkedDesc(),
				caution: false,
				items: scan.orphans.filter((o) => o.linked).map(orphanItem),
			},
			{
				id: "partial",
				title: m.downloads_group_partial(),
				description: m.downloads_group_partialDesc(),
				caution: true,
				items: byGroup("partial"),
			},
			{
				id: "not-imported",
				title: m.downloads_group_notImported(),
				description: m.downloads_group_notImportedDesc(),
				caution: true,
				items: byGroup("not-imported"),
			},
		];
		return all.filter((g) => g.items.length > 0);
	}, [data?.scan]);

	const itemsByKey = useMemo(() => {
		const map = new Map<string, Item>();
		for (const g of groups) for (const i of g.items) map.set(i.key, i);
		return map;
	}, [groups]);

	// Drop selections that disappeared after a refetch
	const selectedItems = [...selected]
		.map((k) => itemsByKey.get(k))
		.filter((i): i is Item => !!i);
	const selectedBytes = selectedItems.reduce(
		(s, i) => s + i.reclaimableBytes,
		0,
	);

	if (isPending) {
		return (
			<Card className="mt-8">
				<CardHeader>
					<Skeleton className="h-5 w-40" />
					<Skeleton className="mt-2 h-4 w-80" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-16 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (isError || !data) {
		return (
			<Alert variant="destructive" className="mt-8">
				<AlertDescription>{m.downloads_errorLoading()}</AlertDescription>
			</Alert>
		);
	}

	const { status, scan } = data;
	// Only meaningful with qBittorrent + at least one *arr
	if (!status.relevant) return null;

	const fixable = status.issues.filter((i) => i.fixable);
	const problems = status.issues.filter((i) => i.severity !== "info");
	const needsCredentials = !status.qbittorrent.reachable;
	const webhookActive =
		status.uiServiceActive &&
		status.webhookSecretConfigured &&
		!status.issues.some(
			(i) =>
				i.severity !== "info" && i.message.toLowerCase().includes("webhook"),
		);

	const toggle = (key: string, on: boolean) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (on) next.add(key);
			else next.delete(key);
			return next;
		});
	};

	const toggleGroup = (group: Group, on: boolean) => {
		setSelected((prev) => {
			const next = new Set(prev);
			for (const i of group.items) {
				if (on) next.add(i.key);
				else next.delete(i.key);
			}
			return next;
		});
	};

	const handleFix = () => {
		const credentials =
			needsCredentials && username && password ? { username, password } : null;
		fix.mutate(
			{ credentials },
			{
				onSuccess: (result) => {
					const failed = result.steps.filter((s) => !s.ok);
					if (failed.length > 0) {
						toast.warning(m.downloads_applyPartial(), {
							description: failed
								.map((s) => `${s.app}: ${s.error ?? s.message}`)
								.join("\n"),
						});
					} else {
						toast.success(m.downloads_applied());
					}
					setPassword("");
				},
				onError: (err) =>
					toast.error(m.downloads_applyFailed(), {
						description: err instanceof Error ? err.message : String(err),
					}),
			},
		);
	};

	const handlePrune = () => {
		const hashes = selectedItems
			.filter((i) => i.kind === "torrent")
			.map((i) => i.id);
		const orphanPaths = selectedItems
			.filter((i) => i.kind === "orphan")
			.map((i) => i.id);
		prune.mutate(
			{ hashes, orphanPaths },
			{
				onSuccess: (result) => {
					const count =
						result.removedTorrents.length + result.deletedOrphans.length;
					if (count > 0) {
						toast.success(
							m.downloads_removed({
								count: String(count),
								size: formatFileSize(result.freedBytes),
							}),
						);
					}
					if (result.failed.length > 0) {
						toast.error(
							m.downloads_removeFailed({
								count: String(result.failed.length),
							}),
							{
								description: result.failed
									.map((f) => `${f.target}: ${f.error}`)
									.join("\n"),
							},
						);
					}
					setSelected(new Set());
				},
				onError: (err) =>
					toast.error(
						m.downloads_removeFailed({ count: String(selectedItems.length) }),
						{
							description: err instanceof Error ? err.message : String(err),
						},
					),
				onSettled: () => setConfirmOpen(false),
			},
		);
	};

	return (
		<Card className="mt-8">
			<CardHeader>
				<div className="flex items-start justify-between gap-4">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Download className="size-5" />
							{m.downloads_title()}
						</CardTitle>
						<CardDescription className="mt-1">
							{m.downloads_subtitle()}
						</CardDescription>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => refetch()}
						disabled={isFetching}
						aria-label={m.downloads_refresh()}
					>
						<RefreshCw className={isFetching ? "animate-spin" : ""} />
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				<p className="text-sm text-muted-foreground">
					{m.downloads_howItWorks()}
				</p>

				{/* Settings */}
				<section className="space-y-3">
					<div className="flex flex-wrap items-center gap-2 text-sm">
						{problems.length === 0 ? (
							<>
								<CheckCircle2 className="size-4 text-emerald-500" />
								<span>{m.downloads_settingsOk()}</span>
							</>
						) : (
							<>
								<AlertTriangle className="size-4 text-amber-500" />
								<span>
									{m.downloads_settingsIssues({
										count: String(problems.length),
									})}
								</span>
							</>
						)}
						<Badge variant={webhookActive ? "secondary" : "outline"}>
							{webhookActive
								? m.downloads_webhookActive()
								: m.downloads_webhookInactive()}
						</Badge>
					</div>

					{status.issues.length > 0 && (
						<ul className="space-y-1.5">
							{status.issues.map((issue) => (
								<IssueRow key={`${issue.app}:${issue.message}`} issue={issue} />
							))}
						</ul>
					)}

					{needsCredentials && (
						<div className="space-y-3 rounded-md border p-3">
							<p className="text-sm text-muted-foreground">
								{m.downloads_qbitUnreachable()}
							</p>
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="qbt-username">
										{m.downloads_qbitUsername()}
									</Label>
									<Input
										id="qbt-username"
										autoComplete="off"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="qbt-password">
										{m.downloads_qbitPassword()}
									</Label>
									<Input
										id="qbt-password"
										type="password"
										autoComplete="off"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
									/>
								</div>
							</div>
						</div>
					)}

					{(fixable.length > 0 || needsCredentials) && (
						<Button
							onClick={handleFix}
							disabled={
								fix.isPending || (needsCredentials && (!username || !password))
							}
						>
							{fix.isPending ? (
								<>
									<Loader2 className="animate-spin" />
									{m.downloads_applying()}
								</>
							) : (
								m.downloads_apply()
							)}
						</Button>
					)}
				</section>

				{/* Leftovers */}
				{scan && (
					<section className="space-y-4">
						{scan.error && (
							<Alert variant="destructive">
								<AlertDescription>
									{m.downloads_scanError({ error: scan.error })}
								</AlertDescription>
							</Alert>
						)}

						<div className="flex flex-wrap items-center justify-between gap-2 text-sm">
							<span className="text-muted-foreground">
								{m.downloads_healthy({ count: String(scan.healthyCount) })}
							</span>
							{scan.reclaimableBytes > 0 && (
								<span className="font-medium">
									{m.downloads_reclaimable({
										size: formatFileSize(scan.reclaimableBytes),
									})}
								</span>
							)}
						</div>

						{groups.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{m.downloads_nothing()}
							</p>
						) : (
							<>
								{groups.map((group) => {
									const allOn = group.items.every((i) => selected.has(i.key));
									const groupBytes = group.items.reduce(
										(s, i) => s + i.reclaimableBytes,
										0,
									);
									return (
										<div
											key={group.id}
											className={`rounded-md border ${group.caution ? "border-amber-500/40" : ""}`}
										>
											<div className="flex items-start gap-3 border-b p-3">
												<Checkbox
													checked={allOn}
													onCheckedChange={(v) =>
														toggleGroup(group, v === true)
													}
													aria-label={m.downloads_selectAll()}
													className="mt-0.5"
												/>
												<div className="min-w-0 flex-1">
													<div className="flex flex-wrap items-center gap-2">
														<span className="text-sm font-medium">
															{group.title}
														</span>
														<Badge variant="outline">
															{group.items.length}
														</Badge>
														{groupBytes > 0 && (
															<span className="text-xs text-muted-foreground">
																{m.downloads_frees({
																	size: formatFileSize(groupBytes),
																})}
															</span>
														)}
													</div>
													<p className="mt-0.5 text-xs text-muted-foreground">
														{group.description}
													</p>
												</div>
											</div>
											<ul className="max-h-64 divide-y overflow-y-auto">
												{group.items.map((item) => (
													<li
														key={item.key}
														className="flex items-center gap-3 px-3 py-2"
													>
														<Checkbox
															id={item.key}
															checked={selected.has(item.key)}
															onCheckedChange={(v) =>
																toggle(item.key, v === true)
															}
														/>
														<label
															htmlFor={item.key}
															className="min-w-0 flex-1 cursor-pointer"
														>
															<span className="block truncate text-sm">
																{item.name}
															</span>
															<span className="block truncate text-xs text-muted-foreground">
																{item.detail}
															</span>
														</label>
														<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
															{formatFileSize(item.reclaimableBytes)}
														</span>
													</li>
												))}
											</ul>
										</div>
									);
								})}

								<div className="flex justify-end">
									<Button
										variant="destructive"
										disabled={selectedItems.length === 0 || prune.isPending}
										onClick={() => setConfirmOpen(true)}
									>
										<Trash2 />
										{m.downloads_removeSelected({
											count: String(selectedItems.length),
										})}
									</Button>
								</div>
							</>
						)}
					</section>
				)}
			</CardContent>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{m.downloads_confirmTitle({
								count: String(selectedItems.length),
							})}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{m.downloads_confirmDesc({ size: formatFileSize(selectedBytes) })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={prune.isPending}>
							{m.common_cancel()}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handlePrune();
							}}
							disabled={prune.isPending}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							{prune.isPending && <Loader2 className="animate-spin" />}
							{m.downloads_remove()}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}

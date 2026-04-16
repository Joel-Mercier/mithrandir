import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	AlertTriangle,
	ArrowDownToLine,
	Box,
	CircleCheck,
	CircleMinus,
	CircleX,
	ExternalLink,
	Loader2,
	Play,
	RefreshCw,
	RotateCcw,
	Square,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AvailableDetailPage } from "#/components/apps/AvailableDetailPage";
import { ExternalLinks } from "#/components/apps/ExternalLinks";
import Breadcrumbs from "#/components/Breadcrumbs";
import { ScoreBadge } from "#/components/capacity/ScoreBadge";
import { Row } from "#/components/Row";
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
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Progress } from "#/components/ui/progress";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import {
	useAppDetail,
	useAppLogs,
	useApps,
	useConfig,
	useRestartApp,
	useStartApp,
	useStopApp,
	useUninstallApp,
	useUpdateApp,
	useWireguardPeerQR,
	useWireguardPeers,
} from "#/hooks/homelab";
import type { AppStatus, ContainerInfo } from "#/lib/types";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_app/apps/$appName")({
	component: AppDetailPage,
});

/**
 * Maps an app to the apps that directly depend on it.
 * Derived from the dependency graph — standalone apps are excluded.
 */
const APP_DEPENDENTS: Record<string, string[]> = {
	qbittorrent: ["radarr", "sonarr", "lidarr"],
	prowlarr: ["radarr", "sonarr", "lidarr"],
	radarr: ["bazarr", "seerr", "profilarr"],
	sonarr: ["bazarr", "seerr", "profilarr"],
	jellyfin: ["seerr"],
	duckdns: ["caddy"],
	caddy: ["vaultwarden"],
};

const statusColor: Record<AppStatus, string> = {
	running: "bg-status-healthy/15 text-status-healthy border-status-healthy/30",
	starting:
		"bg-status-warning/15 text-status-warning border-status-warning/30",
	stopped: "bg-muted/50 text-muted-foreground border-muted-foreground/30",
	error: "bg-status-critical/15 text-status-critical border-status-critical/30",
	available:
		"bg-muted/50 text-muted-foreground border-dashed border-muted-foreground/30",
};

function progressColor(pct: number) {
	if (pct >= 80) return "[&>[data-slot=indicator]]:bg-status-critical";
	if (pct >= 60) return "[&>[data-slot=indicator]]:bg-status-warning";
	return "[&>[data-slot=indicator]]:bg-status-healthy";
}

function DetailSkeleton() {
	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />
			<div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex items-center gap-3">
					<Skeleton className="h-8 w-40" />
					<Skeleton className="h-5 w-16 rounded-full" />
					<Skeleton className="h-5 w-14 rounded-full" />
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Skeleton className="h-8 w-16" />
					<Skeleton className="h-8 w-20" />
					<Skeleton className="h-8 w-16" />
				</div>
			</div>
			<Skeleton className="mb-4 h-4 w-64" />
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<Card key={i}>
						<CardHeader className="pb-2">
							<Skeleton className="h-4 w-20" />
						</CardHeader>
						<CardContent className="space-y-3">
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-3 w-3/4" />
							<Skeleton className="h-3 w-1/2" />
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

const containerStatusConfig: Record<
	ContainerInfo["status"],
	{ icon: typeof CircleCheck; label: () => string; className: string }
> = {
	running: {
		icon: CircleCheck,
		label: () => m.appDetail_containerStatusRunning(),
		className: "text-status-healthy",
	},
	starting: {
		icon: Loader2,
		label: () => m.appDetail_containerStatusStarting(),
		className: "text-status-warning",
	},
	stopped: {
		icon: CircleMinus,
		label: () => m.appDetail_containerStatusStopped(),
		className: "text-muted-foreground",
	},
	error: {
		icon: CircleX,
		label: () => m.appDetail_containerStatusError(),
		className: "text-status-critical",
	},
	"not found": {
		icon: CircleX,
		label: () => m.appDetail_containerStatusNotFound(),
		className: "text-muted-foreground",
	},
};

function ContainerRow({ container }: { container: ContainerInfo }) {
	const config = containerStatusConfig[container.status];
	const Icon = config.icon;
	return (
		<div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
			<div className="flex items-center gap-2">
				<Box className="h-3.5 w-3.5 text-muted-foreground" />
				<span className="text-sm capitalize">{container.displayName}</span>
			</div>
			<div className={`flex items-center gap-1.5 ${config.className}`}>
				<Icon
					className={`h-3.5 w-3.5 ${container.status === "starting" ? "animate-spin" : ""}`}
				/>
				<span className="text-xs font-medium">{config.label()}</span>
			</div>
		</div>
	);
}

const LOG_SETTINGS_KEY = "homelab:log-settings";

function readLogSettings(): { tail: number; since: string; follow: boolean } {
	try {
		const raw = localStorage.getItem(LOG_SETTINGS_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			return {
				tail: typeof parsed.tail === "number" && parsed.tail > 0 ? parsed.tail : 100,
				since: typeof parsed.since === "string" ? parsed.since : "",
				follow: typeof parsed.follow === "boolean" ? parsed.follow : false,
			};
		}
	} catch {}
	return { tail: 100, since: "", follow: false };
}

function writeLogSettings(settings: { tail: number; since: string; follow: boolean }) {
	try {
		localStorage.setItem(LOG_SETTINGS_KEY, JSON.stringify(settings));
	} catch {}
}

function AppDetailPage() {
	const { appName } = Route.useParams();
	const detailQuery = useAppDetail(appName);
	const appsQuery = useApps();
	const configQuery = useConfig();
	const startAppMutation = useStartApp();
	const stopAppMutation = useStopApp();
	const restartAppMutation = useRestartApp();
	const uninstallMutation = useUninstallApp();
	const updateAppMutation = useUpdateApp();

	const [uninstallOpen, setUninstallOpen] = useState(false);
	const [eraseData, setEraseData] = useState(false);
	const logAreaRef = useRef<HTMLDivElement>(null);
	const [selectedPeer, setSelectedPeer] = useState<string | null>(null);

	// Log viewer state — persisted in localStorage (shared across all app detail pages)
	const [logTail, setLogTailState] = useState(() => readLogSettings().tail);
	const [logSince, setLogSinceState] = useState(() => readLogSettings().since);
	const [logFollow, setLogFollowState] = useState(() => readLogSettings().follow);
	const setLogTail = useCallback((val: number) => {
		setLogTailState(val);
		writeLogSettings({ tail: val, since: logSince, follow: logFollow });
	}, [logSince, logFollow]);
	const setLogSince = useCallback((val: string) => {
		setLogSinceState(val);
		writeLogSettings({ tail: logTail, since: val, follow: logFollow });
	}, [logTail, logFollow]);
	const setLogFollow = useCallback((val: boolean) => {
		setLogFollowState(val);
		writeLogSettings({ tail: logTail, since: logSince, follow: val });
	}, [logTail, logSince]);
	const [sseLogs, setSseLogs] = useState<string[]>([]);
	const eventSourceRef = useRef<EventSource | null>(null);

	// Fetch logs via query (non-follow mode)
	const logsQuery = useAppLogs(appName, {
		tail: logTail,
		since: logSince,
		enabled: !logFollow,
	});

	// SSE follow mode with reconnect on transient errors
	useEffect(() => {
		if (!logFollow) {
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
				eventSourceRef.current = null;
			}
			return;
		}

		let retries = 0;
		const MAX_RETRIES = 5;
		let retryTimer: ReturnType<typeof setTimeout> | null = null;

		function connect() {
			const es = new EventSource(`/api/homelab/logs/${appName}`);
			eventSourceRef.current = es;

			es.onopen = () => {
				retries = 0;
			};

			es.onmessage = (event) => {
				setSseLogs((prev) => [...prev, event.data]);
			};

			es.onerror = () => {
				es.close();
				eventSourceRef.current = null;

				if (retries < MAX_RETRIES) {
					const delay = Math.min(1000 * 2 ** retries, 10000);
					retries++;
					retryTimer = setTimeout(connect, delay);
				} else {
					setLogFollow(false);
					toast.error(m.appDetail_logStreamDisconnected());
				}
			};
		}

		setSseLogs([]);
		connect();

		return () => {
			if (retryTimer) clearTimeout(retryTimer);
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
				eventSourceRef.current = null;
			}
		};
	}, [logFollow, appName, setLogFollow]);

	// WireGuard peers
	const isWireguard = appName === "wireguard";
	const peersQuery = useWireguardPeers(isWireguard);
	const peerQRQuery = useWireguardPeerQR(selectedPeer);
	const peers = useMemo(() => peersQuery.data ?? [], [peersQuery.data]);

	// Derive displayed logs: SSE logs in follow mode, query logs otherwise, fall back to detail logs
	const displayedLogs = logFollow
		? sseLogs
		: (logsQuery.data ?? detailQuery.data?.logs ?? []);

	const scrollToBottom = useCallback(() => {
		const vp = logAreaRef.current?.querySelector<HTMLDivElement>(
			"[data-slot=scroll-area-viewport]",
		);
		if (vp) vp.scrollTop = vp.scrollHeight;
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [displayedLogs, scrollToBottom]);

	if (detailQuery.isPending || appsQuery.isPending) {
		return <DetailSkeleton />;
	}

	const detail = detailQuery.data ?? null;
	const allApps = appsQuery.data ?? [];
	const summary = allApps.find((a) => a.name === appName);
	const app = detail ?? summary;

	if (!app) {
		return (
			<div className="mx-auto max-w-7xl px-4 py-8">
				<Breadcrumbs />
				{detailQuery.isError ? (
					<Alert variant="destructive" className="mt-4">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{m.appDetail_errorLoading()}</AlertDescription>
					</Alert>
				) : (
					<div className="py-12 text-center text-sm text-muted-foreground">
						App &ldquo;{appName}&rdquo; not found.
					</div>
				)}
			</div>
		);
	}

	if (app.status === "available") {
		return <AvailableDetailPage app={app} />;
	}

	const isMutating =
		startAppMutation.isPending ||
		stopAppMutation.isPending ||
		restartAppMutation.isPending ||
		uninstallMutation.isPending ||
		updateAppMutation.isPending;

	const config = configQuery.data;
	const appUrl =
		config?.httpsEnabled && config.duckdnsDomain
			? `https://${app.name}.${config.duckdnsDomain}`
			: `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:${app.port}`;

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />

			{/* Header */}
			<div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex flex-wrap items-center gap-3">
					{app.icon && (
						<img src={app.icon} alt="" className="h-8 w-8 rounded" />
					)}
					<h1 className="font-display text-2xl font-bold tracking-tight">
						{app.displayName}
					</h1>
					<Badge
						variant="outline"
						className={`${statusColor[app.status]} ${app.status === "starting" ? "gap-1" : ""}`}
					>
						{app.status === "starting" && (
							<Spinner size="sm" className="h-3 w-3 text-status-warning" />
						)}
						{app.status}
					</Badge>
					<Badge variant="outline" className="hidden capitalize sm:inline-flex">
						{app.category}
					</Badge>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{app.status === "running" || app.status === "starting" ? (
						<>
							<Button
								variant="outline"
								size="sm"
								className="cursor-pointer gap-1.5"
								disabled={isMutating}
								onClick={() => {
									stopAppMutation.mutate(appName, {
										onSuccess: () =>
											toast.success(
												`${app.displayName} ${m.appDetail_stopped()}`,
											),
										onError: (err) =>
											toast.error(
												m.appDetail_failedToStop({ error: err.message }),
											),
									});
								}}
							>
								<Square className="h-3.5 w-3.5" />
								{m.common_stop()}
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="cursor-pointer gap-1.5"
								disabled={isMutating}
								onClick={() => {
									restartAppMutation.mutate(appName, {
										onSuccess: () =>
											toast.success(
												`${app.displayName} ${m.appDetail_restarted()}`,
											),
										onError: (err) =>
											toast.error(
												m.appDetail_failedToRestart({ error: err.message }),
											),
									});
								}}
							>
								<RotateCcw className="h-3.5 w-3.5" />
								{m.common_restart()}
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="cursor-pointer gap-1.5"
								disabled={isMutating}
								onClick={() => {
									toast.info(
										m.appDetail_checkingUpdates({ appName: app.displayName }),
									);
									updateAppMutation.mutate(appName, {
										onSuccess: (result) =>
											result.alreadyUpToDate
												? toast.success(
														m.appDetail_alreadyUpToDate({
															appName: app.displayName,
														}),
													)
												: toast.success(
														m.appDetail_updated({
															appName: app.displayName,
														}),
													),
										onError: (err) =>
											toast.error(
												m.appDetail_failedToUpdate({ error: err.message }),
											),
									});
								}}
							>
								{updateAppMutation.isPending ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
								) : (
									<ArrowDownToLine className="h-3.5 w-3.5" />
								)}
								{m.common_update()}
							</Button>
							{app.status === "starting" ? (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<span>
												<Button
													variant="outline"
													size="sm"
													className="gap-1.5"
													disabled
												>
													<ExternalLink className="h-3.5 w-3.5" />
													{m.common_open()}
												</Button>
											</span>
										</TooltipTrigger>
										<TooltipContent>
											{m.appDetail_openDisabledStarting()}
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							) : (
								<Button
									variant="outline"
									size="sm"
									className="cursor-pointer gap-1.5"
									asChild
								>
									<a href={appUrl} target="_blank" rel="noopener noreferrer">
										<ExternalLink className="h-3.5 w-3.5" />
										{m.common_open()}
									</a>
								</Button>
							)}
						</>
					) : (
						<>
							<Button
								variant="outline"
								size="sm"
								className="cursor-pointer gap-1.5"
								disabled={isMutating}
								onClick={() => {
									startAppMutation.mutate(appName, {
										onSuccess: () =>
											toast.success(
												`${app.displayName} ${m.appDetail_started()}`,
											),
										onError: (err) =>
											toast.error(
												m.appDetail_failedToStart({ error: err.message }),
											),
									});
								}}
							>
								<Play className="h-3.5 w-3.5" />
								{m.common_start()}
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="cursor-pointer gap-1.5"
								disabled={isMutating}
								onClick={() => {
									toast.info(
										m.appDetail_checkingUpdates({ appName: app.displayName }),
									);
									updateAppMutation.mutate(appName, {
										onSuccess: (result) =>
											result.alreadyUpToDate
												? toast.success(
														m.appDetail_alreadyUpToDate({
															appName: app.displayName,
														}),
													)
												: toast.success(
														m.appDetail_updated({
															appName: app.displayName,
														}),
													),
										onError: (err) =>
											toast.error(
												m.appDetail_failedToUpdate({ error: err.message }),
											),
									});
								}}
							>
								{updateAppMutation.isPending ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
								) : (
									<ArrowDownToLine className="h-3.5 w-3.5" />
								)}
								{m.common_update()}
							</Button>
						</>
					)}
					<Button
						variant="outline"
						size="sm"
						className="cursor-pointer gap-1.5 text-status-critical hover:bg-status-critical/10 hover:border-status-critical/30"
						onClick={() => {
							setEraseData(false);
							setUninstallOpen(true);
						}}
					>
						<Trash2 className="h-3.5 w-3.5" />
						{m.common_uninstall()}
					</Button>
				</div>
			</div>

			<p className="mb-4 text-sm text-muted-foreground">{app.description}</p>

			<div className="mb-6">
				<ExternalLinks website={summary?.website} github={summary?.github} />
			</div>

			{app.status === "starting" && (
				<Alert className="mb-6 border-status-warning/30 bg-status-warning/5 text-status-warning">
					<Spinner size="sm" className="text-status-warning" />
					<AlertDescription className="text-status-warning">
						{m.appDetail_containerStarting({ appName: app.displayName })}
					</AlertDescription>
				</Alert>
			)}

			{app.status === "stopped" && (
				<Alert className="mb-6 border-status-warning/30 text-status-warning">
					<AlertDescription>{m.appDetail_containerStopped()}</AlertDescription>
				</Alert>
			)}

			{app.status === "error" && (
				<Alert variant="destructive" className="mb-6">
					<AlertDescription>{m.appDetail_containerError()}</AlertDescription>
				</Alert>
			)}

			{/* Cards grid */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{/* Container Info */}
				{detail && (
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								{m.appDetail_container()}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<Row label={m.appDetail_image()}>{detail.image}</Row>
							{detail.version && (
								<Row label={m.appDetail_version()}>{detail.version}</Row>
							)}
							<Row label={m.appDetail_port()}>:{detail.port}</Row>
							<Row label={m.appDetail_restarts()}>{detail.restarts}</Row>
							<Row label={m.appDetail_created()}>
								{new Date(detail.createdAt).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
									year: "numeric",
								})}
							</Row>
							<Row label={m.appDetail_uptime()}>{detail.uptime}</Row>
						</CardContent>
					</Card>
				)}

				{/* Resources */}
				{detail && app.status === "running" && (
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								{m.appDetail_resources()}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-1.5">
								<div className="flex items-baseline justify-between text-sm">
									<span className="text-muted-foreground">
										{m.appDetail_cpu()}
									</span>
									<span className="font-mono-data text-xs">
										{detail.cpuUsage}%
									</span>
								</div>
								<Progress
									value={detail.cpuUsage}
									className={progressColor(detail.cpuUsage)}
								/>
							</div>
							<div className="space-y-1.5">
								<div className="flex items-baseline justify-between text-sm">
									<span className="text-muted-foreground">
										{m.appDetail_memory()}
									</span>
									<span className="font-mono-data text-xs">
										{detail.ramUsageMB} MB
									</span>
								</div>
								<Progress
									value={Math.min(
										Math.round((detail.ramUsageMB / 1024) * 100),
										100,
									)}
									className={progressColor(
										Math.round((detail.ramUsageMB / 1024) * 100),
									)}
								/>
							</div>
							<Separator />
							<Row label={m.appDetail_netIn()}>{detail.networkRx}</Row>
							<Row label={m.appDetail_netOut()}>{detail.networkTx}</Row>
						</CardContent>
					</Card>
				)}

				{/* Volumes */}
				{detail && (
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								{m.appDetail_volumesConfig()}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<Row label={m.appDetail_configPath()}>{detail.configPath}</Row>
							<Separator className="my-2" />
							{detail.volumes.map((vol) => (
								<div key={vol} className="font-mono-data text-xs break-all">
									{vol}
								</div>
							))}
						</CardContent>
					</Card>
				)}

				{/* Additional Containers */}
				{detail?.additionalContainers && detail.additionalContainers.length > 0 && (
					<Card>
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<CardTitle className="text-sm font-medium">
									{m.appDetail_additionalContainers()}
								</CardTitle>
								<span className="text-xs text-muted-foreground">
									{m.appDetail_additionalContainersCount({ count: detail.additionalContainers.length + 1 })}
								</span>
							</div>
						</CardHeader>
						<CardContent className="space-y-1.5">
							{detail.additionalContainers.map((container) => (
								<ContainerRow key={container.name} container={container} />
							))}
						</CardContent>
					</Card>
				)}

				{/* Capacity */}
				{summary?.performanceScore && (
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								{m.appDetail_capacityImpact()}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex items-baseline justify-between text-sm">
								<span className="text-muted-foreground">
									{m.appDetail_performance()}
								</span>
								<ScoreBadge score={summary.performanceScore} />
							</div>
							<div className="flex items-baseline justify-between text-sm">
								<span className="text-muted-foreground">
									{m.appDetail_storage()}
								</span>
								<ScoreBadge score={summary.storageScore!} />
							</div>
							{summary.capacityNote && (
								<>
									<Separator />
									<p className="text-xs text-muted-foreground">
										{summary.capacityNote}
									</p>
								</>
							)}
						</CardContent>
					</Card>
				)}

				{/* WireGuard Peers */}
				{isWireguard && detail && app.status === "running" && (
					<Card className="col-span-full">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								{m.appDetail_wireguardPeers()}
							</CardTitle>
						</CardHeader>
						<CardContent>
							{peers.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									{m.appDetail_wireguardNoPeers()}
								</p>
							) : (
								<div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
									<Select
										value={selectedPeer ?? undefined}
										onValueChange={setSelectedPeer}
									>
										<SelectTrigger className="w-48">
											<SelectValue
												placeholder={m.appDetail_wireguardSelectPeer()}
											/>
										</SelectTrigger>
										<SelectContent>
											{peers.map((peer) => (
												<SelectItem key={peer} value={peer}>
													{peer}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{selectedPeer && (
										<div className="flex flex-col items-center gap-2">
											{peerQRQuery.isPending ? (
												<Skeleton className="h-48 w-48 rounded-md" />
											) : peerQRQuery.data ? (
												<>
													<img
														src={peerQRQuery.data}
														alt={m.appDetail_wireguardQrCode({
															peer: selectedPeer,
														})}
														className="h-48 w-48 rounded-md border border-border/50"
													/>
													<p className="text-xs text-muted-foreground">
														{m.appDetail_wireguardScanQr()}
													</p>
												</>
											) : (
												<p className="text-sm text-muted-foreground">
													{m.appDetail_wireguardNoPeers()}
												</p>
											)}
										</div>
									)}
								</div>
							)}
						</CardContent>
					</Card>
				)}

				{/* Logs */}
				{detail && (
					<Card className="col-span-full">
						<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								{m.appDetail_recentLogs()}
							</CardTitle>
							<div className="flex items-center gap-3">
								<div className="flex items-center gap-1.5">
									<Label
										htmlFor="log-tail"
										className="text-xs text-muted-foreground"
									>
										{m.appDetail_tail()}
									</Label>
									<Input
										id="log-tail"
										type="number"
										min={1}
										value={logTail}
										onChange={(e) => {
											const val = Number.parseInt(e.target.value, 10);
											if (val > 0) setLogTail(val);
										}}
										disabled={logFollow}
										className="h-7 w-20 font-mono-data text-xs"
									/>
								</div>
								<div className="flex items-center gap-1.5">
									<Label
										htmlFor="log-since"
										className="text-xs text-muted-foreground"
									>
										{m.appDetail_since()}
									</Label>
									<Input
										id="log-since"
										value={logSince}
										onChange={(e) => setLogSince(e.target.value)}
										disabled={logFollow}
										placeholder="e.g. 1h, 30m"
										className="h-7 w-28 font-mono-data text-xs"
									/>
								</div>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 gap-1 px-2"
									disabled={logFollow || logsQuery.isFetching}
									onClick={() => logsQuery.refetch()}
								>
									<RefreshCw
										className={`h-3.5 w-3.5 ${logsQuery.isFetching ? "animate-spin" : ""}`}
									/>
									{m.appDetail_refreshLogs()}
								</Button>
								<div className="flex items-center justify-between rounded-lg border border-border/50 px-2.5 py-1 transition-colors hover:bg-muted/50">
									<Label
										htmlFor="log-follow"
										className="mr-2 text-xs text-muted-foreground"
									>
										{m.appDetail_follow()}
									</Label>
									<Switch
										id="log-follow"
										checked={logFollow}
										onCheckedChange={setLogFollow}
									/>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<ScrollArea
								ref={logAreaRef}
								className="h-64 rounded-md border border-border/50 bg-muted/30 p-3"
							>
								<pre className="font-mono-data text-xs leading-relaxed">
									{displayedLogs.join("\n")}
								</pre>
							</ScrollArea>
						</CardContent>
					</Card>
				)}

				{/* No detail data state */}
				{!detail && !detailQuery.isPending && (
					<div className="col-span-full py-8 text-center text-sm text-muted-foreground">
						{m.appDetail_noDetail()}
					</div>
				)}
			</div>

			{detail && (() => {
				const installedNames = new Set(
					allApps
						.filter((a) => a.status !== "available")
						.map((a) => a.name),
				);
				const affectedApps = (APP_DEPENDENTS[appName] ?? [])
					.filter((dep) => installedNames.has(dep))
					.map((dep) => allApps.find((a) => a.name === dep)?.displayName ?? dep);

				return (
				<AlertDialog open={uninstallOpen} onOpenChange={setUninstallOpen}>
					<AlertDialogContent className="bg-background/95 backdrop-blur">
						<AlertDialogHeader>
							<AlertDialogTitle>
								{m.appDetail_uninstallTitle({ appName: app.displayName })}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{m.appDetail_uninstallDescription()}
							</AlertDialogDescription>
						</AlertDialogHeader>
						{affectedApps.length > 0 && (
							<Alert className="border-status-warning/40 bg-status-warning/10 text-status-warning">
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									<p className="font-medium">
										{m.appDetail_uninstallDependencyWarning({
											count: affectedApps.length,
										})}
									</p>
									<p className="mt-1 text-muted-foreground">
										{m.appDetail_uninstallAffectedApps({
											apps: affectedApps.join(", "),
										})}
									</p>
								</AlertDescription>
							</Alert>
						)}
						<div className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
							<div className="space-y-0.5">
								<Label>{m.appDetail_eraseData()}</Label>
								<p className="text-xs text-muted-foreground font-mono-data break-all">
									{detail.configPath}
								</p>
							</div>
							<Switch checked={eraseData} onCheckedChange={setEraseData} />
						</div>
						<AlertDialogFooter>
							<AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
							<AlertDialogAction
								className="bg-status-critical text-white hover:bg-status-critical/90"
								onClick={() => {
									uninstallMutation.mutate(
										{ appName, eraseData },
										{
											onSuccess: () =>
												toast.success(
													eraseData
														? m.appDetail_uninstalledErased({
																appName: app.displayName,
															})
														: m.appDetail_uninstalledPreserved({
																appName: app.displayName,
															}),
												),
											onError: (err) =>
												toast.error(
													m.appDetail_failedUninstall({ error: err.message }),
												),
										},
									);
								}}
							>
								{m.common_uninstall()}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
				);
			})()}
		</div>
	);
}

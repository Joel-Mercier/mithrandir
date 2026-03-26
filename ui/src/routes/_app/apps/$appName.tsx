import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	AlertTriangle,
	ArrowDownToLine,
	ExternalLink,
	Play,
	RotateCcw,
	Square,
	Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { Progress } from "#/components/ui/progress";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { Switch } from "#/components/ui/switch";
import {
	useAppDetail,
	useApps,
	useConfig,
	useRestartApp,
	useStartApp,
	useStopApp,
	useUninstallApp,
} from "#/hooks/homelab";
import type { AppStatus } from "#/lib/types";
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
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

function AppDetailPage() {
	const { appName } = Route.useParams();
	const detailQuery = useAppDetail(appName);
	const appsQuery = useApps();
	const configQuery = useConfig();
	const startAppMutation = useStartApp();
	const stopAppMutation = useStopApp();
	const restartAppMutation = useRestartApp();
	const uninstallMutation = useUninstallApp();

	const [uninstallOpen, setUninstallOpen] = useState(false);
	const [eraseData, setEraseData] = useState(false);
	const logAreaRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const vp = logAreaRef.current?.querySelector<HTMLDivElement>(
			"[data-slot=scroll-area-viewport]",
		);
		if (vp) vp.scrollTop = vp.scrollHeight;
	}, [detailQuery.data?.logs]);

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
		uninstallMutation.isPending;

	const config = configQuery.data;
	const appUrl =
		config?.httpsEnabled && config.duckdnsDomain
			? `https://${app.name}.${config.duckdnsDomain}`
			: `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:${app.port}`;

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />

			{/* Header */}
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					{app.icon && (
						<img src={app.icon} alt="" className="h-8 w-8 rounded" />
					)}
					<h1 className="font-display text-2xl font-bold tracking-tight">
						{app.displayName}
					</h1>
					<Badge variant="outline" className={statusColor[app.status]}>
						{app.status}
					</Badge>
					<Badge variant="outline" className="capitalize">
						{app.category}
					</Badge>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{app.status === "running" ? (
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
								onClick={() =>
									toast.info(
										m.appDetail_checkingUpdates({ appName: app.displayName }),
									)
								}
							>
								<ArrowDownToLine className="h-3.5 w-3.5" />
								{m.common_update()}
							</Button>
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
								onClick={() =>
									toast.info(
										m.appDetail_checkingUpdates({ appName: app.displayName }),
									)
								}
							>
								<ArrowDownToLine className="h-3.5 w-3.5" />
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
										defaultValue="100"
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
										defaultValue="1h"
										placeholder="e.g. 1h, 30m"
										className="h-7 w-28 font-mono-data text-xs"
									/>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border/50 px-2.5 py-1 transition-colors hover:bg-muted/50">
									<Label
										htmlFor="log-follow"
										className="mr-2 text-xs text-muted-foreground"
									>
										{m.appDetail_follow()}
									</Label>
									<Switch id="log-follow" />
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<ScrollArea
								ref={logAreaRef}
								className="h-64 rounded-md border border-border/50 bg-muted/30 p-3"
							>
								<pre className="font-mono-data text-xs leading-relaxed">
									{detail.logs.join("\n")}
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
							<div className="flex gap-2 rounded-lg border border-status-warning/40 bg-status-warning/10 p-3 text-sm">
								<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
								<div>
									<p className="font-medium text-status-warning">
										{m.appDetail_uninstallDependencyWarning({
											count: affectedApps.length,
										})}
									</p>
									<p className="mt-1 text-muted-foreground">
										{m.appDetail_uninstallAffectedApps({
											apps: affectedApps.join(", "),
										})}
									</p>
								</div>
							</div>
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

import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	Cpu,
	Database,
	Gauge,
	HardDrive,
	MemoryStick,
} from "lucide-react";
import Breadcrumbs from "#/components/Breadcrumbs";
import { ScoreBadge } from "#/components/capacity/ScoreBadge";
import { CapacityScoreRing } from "#/components/capacity/ScoreRing";
import { StorageMeter } from "#/components/capacity/StorageMeter";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Progress } from "#/components/ui/progress";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { useCapacity } from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_app/apps/capacity")({
	component: CapacityPage,
});

function verdictColor(color: string) {
	switch (color) {
		case "green":
			return "text-status-healthy";
		case "yellow":
			return "text-status-warning";
		case "red":
			return "text-status-critical";
		default:
			return "text-muted-foreground";
	}
}

function verdictBg(color: string) {
	switch (color) {
		case "green":
			return "bg-status-healthy/10 border-status-healthy/30";
		case "yellow":
			return "bg-status-warning/10 border-status-warning/30";
		case "red":
			return "bg-status-critical/10 border-status-critical/30";
		default:
			return "bg-muted/50 border-border";
	}
}

function CapacitySkeleton() {
	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />
			<div className="mb-6">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="mt-2 h-4 w-64" />
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<Card key={i}>
						<CardHeader className="pb-2">
							<Skeleton className="h-4 w-32" />
						</CardHeader>
						<CardContent className="space-y-3">
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-3 w-3/4" />
						</CardContent>
					</Card>
				))}
			</div>
			<div className="mt-6">
				<Card>
					<CardHeader className="pb-2">
						<Skeleton className="h-4 w-40" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-48 w-full" />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function CapacityPage() {
	const capacityQuery = useCapacity();

	if (capacityQuery.isPending) {
		return <CapacitySkeleton />;
	}

	if (capacityQuery.isError || !capacityQuery.data) {
		return (
			<div className="mx-auto max-w-7xl px-4 py-8">
				<Breadcrumbs />
				<div className="py-12 text-center text-sm text-muted-foreground">
					{m.capacity_errorLoading()}
				</div>
			</div>
		);
	}

	const data = capacityQuery.data;
	const { system, apps } = data;
	const installedApps = apps.filter((a) => a.installed);
	const ramGB =
		system.ramTotalMB > 0 ? (system.ramTotalMB / 1024).toFixed(1) : "?";

	const perfPct =
		data.maxPerformanceScore > 0
			? (data.totalPerformanceScore / data.maxPerformanceScore) * 100
			: 0;
	const storagePct =
		data.maxStorageScore > 0
			? (data.totalStorageScore / data.maxStorageScore) * 100
			: 0;

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-display text-2xl font-bold tracking-tight">
						{m.capacity_title()}
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{m.capacity_subtitle()}
					</p>
				</div>
				<Button variant="outline" size="sm" className="gap-1.5" asChild>
					<Link to="/apps">
						<ArrowLeft className="h-3.5 w-3.5" />
						{m.capacity_backToApps()}
					</Link>
				</Button>
			</div>

			{/* Verdict cards */}
			<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Card className={`border ${verdictBg(data.performanceVerdict.color)}`}>
					<CardContent className="flex items-center gap-5 pt-0">
						<CapacityScoreRing
							score={data.totalPerformanceScore}
							max={data.maxPerformanceScore}
							color={data.performanceVerdict.color}
						/>
						<div className="min-w-0 flex-1">
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								{m.capacity_performance()}
							</p>
							<p
								className={`text-lg font-bold ${verdictColor(data.performanceVerdict.color)}`}
							>
								{data.performanceVerdict.label}
							</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								{data.totalPerformanceScore}/{data.maxPerformanceScore}{" "}
								{m.capacity_loadScore({
									count: String(installedApps.length),
									s: installedApps.length !== 1 ? "s" : "",
								})}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className={`border ${verdictBg(data.storageVerdict.color)}`}>
					<CardContent className="flex items-center gap-5 pt-0">
						<CapacityScoreRing
							score={data.totalStorageScore}
							max={data.maxStorageScore}
							color={data.storageVerdict.color}
						/>
						<div className="min-w-0 flex-1">
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								{m.capacity_storage()}
							</p>
							<p
								className={`text-lg font-bold ${verdictColor(data.storageVerdict.color)}`}
							>
								{data.storageVerdict.label}
							</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								{data.totalStorageScore}/{data.maxStorageScore}{" "}
								{m.capacity_storagePressure({
									count: String(installedApps.length),
									s: installedApps.length !== 1 ? "s" : "",
								})}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* System Hardware */}
			<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-sm font-medium">
							<Cpu className="h-4 w-4 text-muted-foreground" />
							{m.capacity_processor()}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<p className="font-mono-data text-xs leading-relaxed">
							{system.cpuModel}
						</p>
						<Separator />
						<div className="flex items-baseline justify-between text-sm">
							<span className="text-muted-foreground">
								{m.capacity_cores()}
							</span>
							<span className="font-mono-data text-xs font-medium">
								{system.cpuCores}
							</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-sm font-medium">
							<MemoryStick className="h-4 w-4 text-muted-foreground" />
							{m.capacity_memory()}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold tabular-nums">{ramGB} GB</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{m.capacity_totalRam()}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-sm font-medium">
							<HardDrive className="h-4 w-4 text-muted-foreground" />
							{m.capacity_storage()}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{system.storage.length === 0 ? (
							<p className="text-xs text-muted-foreground">
								{m.capacity_noStorage()}
							</p>
						) : (
							system.storage.map((s) => (
								<StorageMeter
									key={s.mountpoint}
									mountpoint={s.mountpoint}
									usedBytes={s.usedBytes}
									totalBytes={s.totalBytes}
									availBytes={s.availBytes}
								/>
							))
						)}
					</CardContent>
				</Card>
			</div>

			{/* Aggregate score bars */}
			<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-sm font-medium">
							<Gauge className="h-4 w-4 text-muted-foreground" />
							{m.capacity_performanceLoad()}
						</CardTitle>
						<CardDescription>
							{m.capacity_performanceLoadDesc()}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="flex items-baseline justify-between text-sm">
							<span className="text-muted-foreground">
								{m.capacity_loadScoreLabel()}
							</span>
							<span className="font-mono-data text-xs">
								{data.totalPerformanceScore}/{data.maxPerformanceScore}
							</span>
						</div>
						<Progress value={perfPct} className={scoreProgressColor(perfPct)} />
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>
								{
									installedApps.filter((a) => a.performanceScore === "high")
										.length
								}{" "}
								{m.capacity_highDemand()}
							</span>
							<span>
								{
									installedApps.filter((a) => a.performanceScore === "low")
										.length
								}{" "}
								{m.capacity_lightweight()}
							</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-sm font-medium">
							<Database className="h-4 w-4 text-muted-foreground" />
							{m.capacity_storagePressureTitle()}
						</CardTitle>
						<CardDescription>
							{m.capacity_storagePressureDesc()}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="flex items-baseline justify-between text-sm">
							<span className="text-muted-foreground">
								{m.capacity_pressureScore()}
							</span>
							<span className="font-mono-data text-xs">
								{data.totalStorageScore}/{data.maxStorageScore}
							</span>
						</div>
						<Progress
							value={storagePct}
							className={scoreProgressColor(storagePct)}
						/>
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>
								{installedApps.filter((a) => a.storageScore === "high").length}{" "}
								{m.capacity_highGrowth()}
							</span>
							<span>
								{installedApps.filter((a) => a.storageScore === "low").length}{" "}
								{m.capacity_lowGrowth()}
							</span>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Per-app table */}
			{installedApps.length > 0 && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">
							{m.capacity_installedApps({
								count: String(installedApps.length),
							})}
						</CardTitle>
						<CardDescription>{m.capacity_perAppDesc()}</CardDescription>
					</CardHeader>
					<CardContent>
						<TooltipProvider>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{m.capacity_tableApp()}</TableHead>
										<TableHead>{m.capacity_tableCategory()}</TableHead>
										<TableHead>{m.capacity_tablePerformance()}</TableHead>
										<TableHead>{m.capacity_tableStorage()}</TableHead>
										<TableHead className="text-right">
											{m.capacity_tableDiskUsage()}
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{installedApps.map((app) => (
										<TableRow key={app.name}>
											<TableCell>
												<Link
													to="/apps/$appName"
													params={{ appName: app.name }}
													className="font-medium hover:underline"
												>
													{app.displayName}
												</Link>
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className="capitalize text-[10px]"
												>
													{app.category}
												</Badge>
											</TableCell>
											<TableCell>
												{app.note ? (
													<Tooltip>
														<TooltipTrigger asChild>
															<span>
																<ScoreBadge score={app.performanceScore} />
															</span>
														</TooltipTrigger>
														<TooltipContent>{app.note}</TooltipContent>
													</Tooltip>
												) : (
													<ScoreBadge score={app.performanceScore} />
												)}
											</TableCell>
											<TableCell>
												<ScoreBadge score={app.storageScore} />
											</TableCell>
											<TableCell className="text-right font-mono-data text-xs">
												{app.diskUsage}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TooltipProvider>
					</CardContent>
				</Card>
			)}

			{installedApps.length === 0 && (
				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-sm text-muted-foreground">
							{m.capacity_noApps()}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Summary footer */}
			<div className="mt-4 text-xs text-muted-foreground">
				{installedApps.length} app{installedApps.length !== 1 ? "s" : ""}{" "}
				{m.capacity_summaryInstalled()} &mdash;{" "}
				{installedApps.filter((a) => a.performanceScore === "high").length}{" "}
				{m.capacity_summaryHighPerformance()},{" "}
				{installedApps.filter((a) => a.storageScore === "high").length}{" "}
				{m.capacity_summaryHighStorage()}
			</div>
		</div>
	);
}

function scoreProgressColor(pct: number) {
	if (pct >= 75) return "[&>[data-slot=progress-indicator]]:bg-status-critical";
	if (pct >= 50) return "[&>[data-slot=progress-indicator]]:bg-status-warning";
	return "[&>[data-slot=progress-indicator]]:bg-status-healthy";
}

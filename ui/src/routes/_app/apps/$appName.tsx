import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowDownToLine,
	ExternalLink,
	Play,
	RotateCcw,
	Square,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Breadcrumbs from "#/components/Breadcrumbs";
import { Row } from "#/components/Row";
import { AvailableDetailPage } from "#/components/apps/AvailableDetailPage";
import { ExternalLinks } from "#/components/apps/ExternalLinks";
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
import { Switch } from "#/components/ui/switch";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Separator } from "#/components/ui/separator";
import type { AppStatus } from "#/lib/mock-data";
import { mockAppDetails, mockApps } from "#/lib/mock-data";

export const Route = createFileRoute("/_app/apps/$appName")({
	component: AppDetailPage,
});

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

function AppDetailPage() {
	const { appName } = Route.useParams();
	const detail = mockAppDetails[appName];
	const summary = mockApps.find((a) => a.name === appName);
	const app = detail ?? summary;
	const [uninstallOpen, setUninstallOpen] = useState(false);
	const [eraseData, setEraseData] = useState(false);

	if (!app) {
		return (
			<div className="mx-auto max-w-7xl px-4 py-8">
				<Breadcrumbs />
				<div className="py-12 text-center text-sm text-muted-foreground">
					App &ldquo;{appName}&rdquo; not found.
				</div>
			</div>
		);
	}

	if (app.status === "available") {
		return <AvailableDetailPage app={app} />;
	}

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />

			{/* Header */}
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
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
								className="gap-1.5"
								onClick={() => toast.success(`${app.displayName} stopped.`)}
							>
								<Square className="h-3.5 w-3.5" />
								Stop
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={() => toast.success(`${app.displayName} restarted.`)}
							>
								<RotateCcw className="h-3.5 w-3.5" />
								Restart
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={() =>
									toast.info(`Checking for updates to ${app.displayName}...`)
								}
							>
								<ArrowDownToLine className="h-3.5 w-3.5" />
								Update
							</Button>
							<Button variant="outline" size="sm" className="gap-1.5" asChild>
								<a
									href={`http://localhost:${app.port}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<ExternalLink className="h-3.5 w-3.5" />
									Open
								</a>
							</Button>
						</>
					) : (
						<>
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={() => toast.success(`${app.displayName} started.`)}
							>
								<Play className="h-3.5 w-3.5" />
								Start
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={() =>
									toast.info(`Checking for updates to ${app.displayName}...`)
								}
							>
								<ArrowDownToLine className="h-3.5 w-3.5" />
								Update
							</Button>
						</>
					)}
					<Button
						variant="outline"
						size="sm"
						className="gap-1.5 text-status-critical hover:bg-status-critical/10 hover:border-status-critical/30"
						onClick={() => {
							setEraseData(false);
							setUninstallOpen(true);
						}}
					>
						<Trash2 className="h-3.5 w-3.5" />
						Uninstall
					</Button>
				</div>
			</div>

			<p className="mb-4 text-sm text-muted-foreground">{app.description}</p>

			<div className="mb-6">
				<ExternalLinks website={summary?.website} github={summary?.github} />
			</div>

			{app.status === "stopped" && (
				<Alert className="mb-6 border-status-warning/30 text-status-warning">
					<AlertDescription>
						This container is stopped. Start it to view resource usage and live
						logs.
					</AlertDescription>
				</Alert>
			)}

			{app.status === "error" && (
				<Alert variant="destructive" className="mb-6">
					<AlertDescription>
						This container is in an error state. Check the logs for details.
					</AlertDescription>
				</Alert>
			)}

			{/* Cards grid */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{/* Container Info */}
				{detail && (
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">Container</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<Row label="Image">{detail.image}</Row>
							<Row label="Port">:{detail.port}</Row>
							<Row label="Restarts">{detail.restarts}</Row>
							<Row label="Created">
								{new Date(detail.createdAt).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
									year: "numeric",
								})}
							</Row>
							<Row label="Uptime">{detail.uptime}</Row>
						</CardContent>
					</Card>
				)}

				{/* Resources */}
				{detail && app.status === "running" && (
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">Resources</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-1.5">
								<div className="flex items-baseline justify-between text-sm">
									<span className="text-muted-foreground">CPU</span>
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
									<span className="text-muted-foreground">Memory</span>
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
							<Row label="Network Rx">{detail.networkRx}</Row>
							<Row label="Network Tx">{detail.networkTx}</Row>
						</CardContent>
					</Card>
				)}

				{/* Volumes */}
				{detail && (
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium">
								Volumes & Config
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<Row label="Config path">{detail.configPath}</Row>
							<Separator className="my-2" />
							{detail.volumes.map((vol) => (
								<div key={vol} className="font-mono-data text-xs break-all">
									{vol}
								</div>
							))}
						</CardContent>
					</Card>
				)}

				{/* Logs */}
				{detail && (
					<Card className="col-span-full">
						<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Recent Logs
							</CardTitle>
							<div className="flex items-center gap-3">
								<div className="flex items-center gap-1.5">
									<Label
										htmlFor="log-tail"
										className="text-xs text-muted-foreground"
									>
										Tail
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
										Since
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
										Follow
									</Label>
									<Switch id="log-follow" />
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<ScrollArea className="h-64 rounded-md border border-border/50 bg-muted/30 p-3">
								<pre className="font-mono-data text-xs leading-relaxed">
									{detail.logs.join("\n")}
								</pre>
							</ScrollArea>
						</CardContent>
					</Card>
				)}
			</div>

			{detail && (
				<AlertDialog open={uninstallOpen} onOpenChange={setUninstallOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								Uninstall {app.displayName}?
							</AlertDialogTitle>
							<AlertDialogDescription>
								This will stop and remove the container. This action cannot be
								undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<div className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
							<div className="space-y-0.5">
								<Label>Erase data &amp; config</Label>
								<p className="text-xs text-muted-foreground font-mono-data break-all">
									{detail.configPath}
								</p>
							</div>
							<Switch
								checked={eraseData}
								onCheckedChange={setEraseData}
							/>
						</div>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								className="bg-status-critical text-white hover:bg-status-critical/90"
								onClick={() => {
									toast.error(
										eraseData
											? `${app.displayName} uninstalled. Data at ${detail.configPath} erased.`
											: `${app.displayName} uninstalled. Data preserved.`,
									);
								}}
							>
								Uninstall
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</div>
	);
}

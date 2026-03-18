import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Download } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import { useInstallApp } from "#/hooks/homelab";
import type { AppStatus, DashboardApp } from "#/lib/types";

export const statusDot: Record<AppStatus, string> = {
	running: "bg-status-healthy",
	stopped: "bg-muted-foreground",
	error: "bg-status-critical",
	available: "bg-transparent",
};

export function AppListCard({ app }: { app: DashboardApp }) {
	return (
		<Link to="/apps/$appName" params={{ appName: app.name }}>
			<Card className="group">
				<CardHeader className="flex flex-row items-center justify-between pb-2">
					<div className="flex items-center gap-2">
						<span
							className={`inline-block h-2 w-2 rounded-full ${statusDot[app.status]}`}
						/>
						<CardTitle className="text-sm font-medium">
							{app.displayName}
						</CardTitle>
					</div>
					<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-xs text-muted-foreground">{app.description}</p>

					<div className="flex items-center justify-between">
						<span className="font-mono-data text-xs text-muted-foreground">
							:{app.port}
						</span>
						<Badge variant="outline" className="text-xs capitalize">
							{app.category}
						</Badge>
					</div>

					<div className="flex items-baseline justify-between text-xs text-muted-foreground">
						<span>Uptime</span>
						<span className="font-mono-data">{app.uptime}</span>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}

export function AvailableAppCard({ app }: { app: DashboardApp }) {
	const installMutation = useInstallApp();

	return (
		<Link to="/apps/$appName" params={{ appName: app.name }}>
			<Card className="group border-dashed">
				<CardHeader className="flex flex-row items-center justify-between pb-2">
					<div className="flex items-center gap-2">
						<span className="inline-block h-2 w-2 rounded-full border border-dashed border-muted-foreground" />
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{app.displayName}
						</CardTitle>
					</div>
					<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-xs text-muted-foreground">{app.description}</p>

					<div className="flex items-center justify-between">
						<span className="font-mono-data text-xs text-muted-foreground">
							:{app.port}
						</span>
						<Badge variant="outline" className="text-xs capitalize">
							{app.category}
						</Badge>
					</div>

					<Button
						variant="outline"
						size="sm"
						className="w-full gap-1.5"
						disabled={installMutation.isPending}
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							installMutation.mutate(app.name, {
								onSuccess: (result) => {
									if (result.success) {
										toast.success(
											`${app.displayName} installed successfully.`,
										);
									} else {
										toast.error(
											`Install finished with errors: ${result.output.slice(0, 200)}`,
										);
									}
								},
								onError: (err) =>
									toast.error(
										`Failed to install ${app.displayName}: ${err.message}`,
									),
							});
						}}
					>
						{installMutation.isPending ? (
							<Spinner size="sm" />
						) : (
							<Download className="h-3.5 w-3.5" />
						)}
						{installMutation.isPending ? "Installing..." : "Install"}
					</Button>
				</CardContent>
			</Card>
		</Link>
	);
}

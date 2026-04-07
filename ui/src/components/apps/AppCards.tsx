import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Download } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import { useInstallApp } from "#/hooks/homelab";
import type { AppStatus, DashboardApp } from "#/lib/types";
import { m } from "#/paraglide/messages.js";

const statusDot: Record<AppStatus, string> = {
	running: "bg-status-healthy",
	stopped: "bg-muted-foreground",
	error: "bg-status-critical",
	available: "bg-transparent",
};

export function AppListCard({ app }: { app: DashboardApp }) {
	return (
		<Link to="/apps/$appName" params={{ appName: app.name }}>
			<Card className="group h-full">
				<CardHeader className="flex flex-row items-center justify-between pb-2">
					<div className="flex items-center gap-2">
						<span
							className={`inline-block h-2 w-2 rounded-full ${statusDot[app.status]}`}
						/>
						{app.icon && (
							<img src={app.icon} alt="" className="h-5 w-5 shrink-0 rounded" />
						)}
						<CardTitle className="text-sm font-medium">
							{app.displayName}
						</CardTitle>
					</div>
					<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
				</CardHeader>
				<CardContent className="space-y-3 flex flex-1 flex-col">
					<p className="text-xs text-muted-foreground">{app.description}</p>
          <div className="mt-auto">
            <div className="flex items-center justify-between">
              <span className="font-mono-data text-xs text-muted-foreground">
                :{app.port}
              </span>
              <Badge variant="outline" className="text-xs capitalize">
                {app.category}
              </Badge>
            </div>
          </div>
					<div className="flex items-baseline justify-between text-xs text-muted-foreground">
						<span>{m.apps_uptime()}</span>
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
			<Card className="group border-dashed h-full">
				<CardHeader className="flex flex-row items-center justify-between pb-2">
					<div className="flex items-center gap-2">
						<span className="inline-block h-2 w-2 rounded-full border border-dashed border-muted-foreground" />
						{app.icon && (
							<img src={app.icon} alt="" className="h-5 w-5 shrink-0 rounded opacity-50" />
						)}
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{app.displayName}
						</CardTitle>
					</div>
					<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
				</CardHeader>
				<CardContent className="space-y-3 flex flex-1 flex-col">
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
						className="w-full gap-1.5 mt-auto"
						disabled={installMutation.isPending}
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							installMutation.mutate(app.name, {
								onSuccess: (result) => {
									if (result.success) {
										toast.success(
											m.apps_installedSuccess({ appName: app.displayName }),
										);
									} else {
										toast.error(
											m.apps_installError({
												error: result.output.slice(0, 200),
											}),
										);
									}
								},
								onError: (err) =>
									toast.error(
										m.apps_installFailed({
											appName: app.displayName,
											error: err.message,
										}),
									),
							});
						}}
					>
						{installMutation.isPending ? (
							<Spinner size="sm" />
						) : (
							<Download className="h-3.5 w-3.5" />
						)}
						{installMutation.isPending
							? m.common_installing()
							: m.common_install()}
					</Button>
				</CardContent>
			</Card>
		</Link>
	);
}

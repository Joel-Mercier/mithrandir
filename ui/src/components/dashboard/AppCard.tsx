import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent } from "#/components/ui/card";
import type { DashboardApp } from "#/lib/types";

const statusDot: Record<string, string> = {
	running: "bg-status-healthy",
	stopped: "bg-muted-foreground",
	error: "bg-status-critical",
};

export default function AppCard({ app }: { app: DashboardApp }) {
	return (
		<Link to="/apps/$appName" params={{ appName: app.name }}>
			<Card className="group transition-colors hover:bg-muted/50">
				<CardContent className="flex items-start gap-3 p-4">
					<span
						className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${statusDot[app.status]}`}
					/>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<span className="font-medium text-sm">{app.displayName}</span>
							<span className="font-mono-data text-xs text-muted-foreground">
								:{app.port}
							</span>
						</div>
						<p className="mt-0.5 text-xs text-muted-foreground truncate">
							{app.description}
						</p>
					</div>
					<Badge variant="outline" className="shrink-0 text-xs capitalize">
						{app.category}
					</Badge>
					<ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
				</CardContent>
			</Card>
		</Link>
	);
}

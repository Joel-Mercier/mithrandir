import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Badge } from "#/components/ui/badge";
import type { HealthStatus } from "#/lib/mock-data";

const verdictColor: Record<string, string> = {
	Comfortable: "bg-status-healthy/15 text-status-healthy border-status-healthy/30",
	Adequate: "bg-status-warning/15 text-status-warning border-status-warning/30",
	Tight: "bg-status-critical/15 text-status-critical border-status-critical/30",
	Overloaded: "bg-status-critical/15 text-status-critical border-status-critical/30",
};

export default function SystemStatusCard({ data }: { data: HealthStatus }) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="text-sm font-medium">System Status</CardTitle>
				<Badge
					variant="outline"
					className={verdictColor[data.performanceVerdict]}
				>
					{data.performanceVerdict}
				</Badge>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex items-center gap-4 text-sm">
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-2 w-2 rounded-full bg-status-healthy" />
						<span className="font-mono-data">{data.appsRunning}</span>
						<span className="text-muted-foreground">Running</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" />
						<span className="font-mono-data">{data.appsStopped}</span>
						<span className="text-muted-foreground">Stopped</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="font-mono-data">{data.appsTotal}</span>
						<span className="text-muted-foreground">Total</span>
					</div>
				</div>
				<div className="flex items-center gap-2 text-sm">
					<span
						className={`inline-block h-2 w-2 rounded-full ${data.dockerRunning ? "bg-status-healthy" : "bg-status-critical"}`}
					/>
					<span className="text-muted-foreground">Docker Engine</span>
					<span className="font-mono-data text-xs">
						{data.dockerRunning ? "running" : "stopped"}
					</span>
				</div>
			</CardContent>
		</Card>
	);
}

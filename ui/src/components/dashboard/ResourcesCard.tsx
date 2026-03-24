import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Progress } from "#/components/ui/progress";
import type { SystemResources } from "#/lib/types";
import { m } from "#/paraglide/messages.js";

function progressColor(pct: number) {
	if (pct >= 80) return "[&>[data-slot=indicator]]:bg-status-critical";
	if (pct >= 60) return "[&>[data-slot=indicator]]:bg-status-warning";
	return "[&>[data-slot=indicator]]:bg-status-healthy";
}

export default function ResourcesCard({ data }: { data: SystemResources }) {
	const ramPct = Math.round((data.ramUsedGB / data.ramTotalGB) * 100);

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">
					{m.resources_title()}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* CPU */}
				<div className="space-y-1.5">
					<div className="flex items-baseline justify-between text-sm">
						<span className="text-muted-foreground">{m.resources_cpu()}</span>
						<span className="font-mono-data text-xs">{data.cpuUsage}%</span>
					</div>
					<Progress
						value={data.cpuUsage}
						className={progressColor(data.cpuUsage)}
					/>
					<p className="font-mono-data text-xs text-muted-foreground">
						{data.cpuModel} &middot; {data.cores} cores
					</p>
				</div>

				{/* RAM */}
				<div className="space-y-1.5">
					<div className="flex items-baseline justify-between text-sm">
						<span className="text-muted-foreground">
							{m.resources_memory()}
						</span>
						<span className="font-mono-data text-xs">
							{data.ramUsedGB} / {data.ramTotalGB} GB
						</span>
					</div>
					<Progress value={ramPct} className={progressColor(ramPct)} />
				</div>

				{/* Storage mounts */}
				{data.mounts.map((mount) => {
					const pct = Math.round((mount.usedGB / mount.totalGB) * 100);
					return (
						<div key={mount.path} className="space-y-1.5">
							<div className="flex items-baseline justify-between text-sm">
								<span className="font-mono-data text-muted-foreground">
									{mount.path}
								</span>
								<span className="font-mono-data text-xs">
									{mount.usedGB} / {mount.totalGB} GB
								</span>
							</div>
							<Progress value={pct} className={progressColor(pct)} />
						</div>
					);
				})}
			</CardContent>
		</Card>
	);
}

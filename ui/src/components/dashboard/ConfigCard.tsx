import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Badge } from "#/components/ui/badge";
import type { SystemConfig } from "#/lib/types";

function StatusBadge({ enabled }: { enabled: boolean }) {
	return (
		<Badge
			variant="outline"
			className={
				enabled
					? "border-status-healthy/30 bg-status-healthy/15 text-status-healthy"
					: "border-muted-foreground/30 bg-muted/50 text-muted-foreground"
			}
		>
			{enabled ? "Enabled" : "Disabled"}
		</Badge>
	);
}

export default function ConfigCard({ data }: { data: SystemConfig }) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">Configuration</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				<div className="flex items-baseline justify-between text-sm">
					<span className="text-muted-foreground">Timezone</span>
					<span className="font-mono-data text-xs">{data.timezone}</span>
				</div>
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">HTTPS</span>
					<StatusBadge enabled={data.httpsEnabled} />
				</div>
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">Firewall</span>
					<StatusBadge enabled={data.firewallEnabled} />
				</div>
				<div className="flex items-baseline justify-between text-sm">
					<span className="text-muted-foreground">Base directory</span>
					<span className="font-mono-data text-xs">{data.baseDir}</span>
				</div>
			</CardContent>
		</Card>
	);
}

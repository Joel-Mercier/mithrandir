import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import type { SystemConfig } from "#/lib/types";
import { m } from "#/paraglide/messages.js";

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
			{enabled ? m.common_enabled() : m.common_disabled()}
		</Badge>
	);
}

export default function ConfigCard({ data }: { data: SystemConfig }) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">
					{m.config_title()}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				<div className="flex items-baseline justify-between text-sm">
					<span className="text-muted-foreground">{m.config_timezone()}</span>
					<span className="font-mono-data text-xs">{data.timezone}</span>
				</div>
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">{m.config_https()}</span>
					<StatusBadge enabled={data.httpsEnabled} />
				</div>
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">{m.config_firewall()}</span>
					<StatusBadge enabled={data.firewallEnabled} />
				</div>
				<div className="flex items-baseline justify-between text-sm">
					<span className="text-muted-foreground">{m.config_baseDir()}</span>
					<span className="font-mono-data text-xs">{data.baseDir}</span>
				</div>
			</CardContent>
		</Card>
	);
}

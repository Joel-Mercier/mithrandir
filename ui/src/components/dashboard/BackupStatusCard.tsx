import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import type { BackupStatus } from "#/lib/types";
import { m } from "#/paraglide/messages.js";

function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-baseline justify-between text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-mono-data text-xs">{children}</span>
		</div>
	);
}

function formatDate(iso: string) {
	const d = new Date(iso);
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function BackupStatusCard({ data }: { data: BackupStatus }) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="text-sm font-medium">
					{m.backupCard_title()}
				</CardTitle>
				{data.encrypted && (
					<Badge
						variant="outline"
						className="border-status-healthy/30 bg-status-healthy/15 text-status-healthy"
					>
						{m.common_encrypted()}
					</Badge>
				)}
			</CardHeader>
			<CardContent className="space-y-2">
				<Row label={m.backupCard_lastBackup()}>
					{formatDate(data.lastBackupDate)}
				</Row>
				<Row label={m.backupCard_nextScheduled()}>
					{String(data.nextScheduledHour).padStart(2, "0")}:00
				</Row>
				<Row label={m.backupCard_localRetention()}>
					{data.localRetention} backups
				</Row>
				<Row label={m.backupCard_remoteRetention()}>
					{data.remoteRetention} backups
				</Row>
				<Row label={m.backupCard_remotes()}>{data.remotes.join(", ")}</Row>
			</CardContent>
		</Card>
	);
}

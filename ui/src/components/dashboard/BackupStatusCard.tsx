import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Badge } from "#/components/ui/badge";
import type { BackupStatus } from "#/lib/mock-data";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
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
				<CardTitle className="text-sm font-medium">Backup</CardTitle>
				{data.encrypted && (
					<Badge
						variant="outline"
						className="border-status-healthy/30 bg-status-healthy/15 text-status-healthy"
					>
						Encrypted
					</Badge>
				)}
			</CardHeader>
			<CardContent className="space-y-2">
				<Row label="Last backup">{formatDate(data.lastBackupDate)}</Row>
				<Row label="Next scheduled">
					{String(data.nextScheduledHour).padStart(2, "0")}:00
				</Row>
				<Row label="Local retention">{data.localRetention} backups</Row>
				<Row label="Remote retention">{data.remoteRetention} backups</Row>
				<Row label="Remotes">{data.remotes.join(", ")}</Row>
			</CardContent>
		</Card>
	);
}

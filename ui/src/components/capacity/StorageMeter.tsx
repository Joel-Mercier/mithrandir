import { Progress } from "#/components/ui/progress";

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const value = bytes / 1024 ** i;
	return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function progressColor(pct: number) {
	if (pct >= 95) return "[&>[data-slot=progress-indicator]]:bg-status-critical";
	if (pct >= 80) return "[&>[data-slot=progress-indicator]]:bg-status-warning";
	return "[&>[data-slot=progress-indicator]]:bg-status-healthy";
}

export function StorageMeter({
	mountpoint,
	usedBytes,
	totalBytes,
	availBytes,
}: {
	mountpoint: string;
	usedBytes: number;
	totalBytes: number;
	availBytes: number;
}) {
	const pct = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

	return (
		<div className="space-y-1.5">
			<div className="flex items-baseline justify-between">
				<span className="font-mono-data text-xs font-medium">{mountpoint}</span>
				<span className="font-mono-data text-xs text-muted-foreground">
					{pct.toFixed(1)}%
				</span>
			</div>
			<Progress value={pct} className={progressColor(pct)} />
			<div className="flex justify-between text-[10px] text-muted-foreground">
				<span>{formatBytes(usedBytes)} used</span>
				<span>{formatBytes(availBytes)} free</span>
			</div>
		</div>
	);
}

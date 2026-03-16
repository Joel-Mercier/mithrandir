import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import type { VersionInfo } from "#/lib/types";

export default function VersionCard({ data }: { data: VersionInfo }) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">Version</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				<div className="flex items-baseline justify-between text-sm">
					<span className="text-muted-foreground">Version</span>
					<span className="font-mono-data text-xs">v{data.version}</span>
				</div>
				<div className="flex items-baseline justify-between text-sm">
					<span className="text-muted-foreground">Commit</span>
					<span className="font-mono-data text-xs">
						{data.gitCommit.slice(0, 7)}
					</span>
				</div>
				<div className="flex items-baseline justify-between text-sm">
					<span className="text-muted-foreground">Build date</span>
					<span className="font-mono-data text-xs">{data.buildDate}</span>
				</div>
			</CardContent>
		</Card>
	);
}

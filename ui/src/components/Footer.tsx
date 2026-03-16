import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { useVersion } from "#/hooks/homelab";

export default function Footer() {
	const versionQuery = useVersion();

	return (
		<footer>
			<Separator />
			<div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
				{versionQuery.isPending ? (
					<Skeleton className="h-3 w-28" />
				) : versionQuery.data ? (
					<span className="font-mono-data text-xs text-muted-foreground">
						Mithrandir v{versionQuery.data.version}
					</span>
				) : (
					<span className="font-mono-data text-xs text-muted-foreground">
						Mithrandir
					</span>
				)}
				<div className="flex items-center gap-4">
					<span className="cursor-not-allowed text-xs text-muted-foreground/50">
						Docs
					</span>
					<span className="cursor-not-allowed text-xs text-muted-foreground/50">
						GitHub
					</span>
				</div>
			</div>
		</footer>
	);
}

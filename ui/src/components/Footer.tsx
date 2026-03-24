import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { useVersion } from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";

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
					<a
						className="text-xs transition text-muted-foreground/50 hover:text-foreground"
						href="https://joel-mercier.github.io/mithrandir"
						target="_blank"
						rel="noreferrer"
					>
						{m.footer_docs()}
					</a>
					<a
						className="text-xs transition text-muted-foreground/50 hover:text-foreground"
						href="https://github.com/joel-mercier/mithrandir"
						target="_blank"
						rel="noreferrer"
					>
						{m.footer_github()}
					</a>
				</div>
			</div>
		</footer>
	);
}

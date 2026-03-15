import { Separator } from "#/components/ui/separator";
import { mockVersion } from "#/lib/mock-data";

export default function Footer() {
	return (
		<footer>
			<Separator />
			<div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
				<span className="font-mono-data text-xs text-muted-foreground">
					Mithrandir v{mockVersion.version}
				</span>
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

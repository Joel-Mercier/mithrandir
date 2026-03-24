import { useNavigate } from "@tanstack/react-router";
import {
	Archive,
	Download,
	History,
	Play,
	RefreshCw,
	Settings,
	Square,
	Trash2,
} from "lucide-react";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { Skeleton } from "#/components/ui/skeleton";
import { useActivity } from "#/hooks/homelab";
import type { ActivityItem } from "#/lib/server/activity";
import { m } from "#/paraglide/messages.js";
import { formatRelativeTime } from "#/lib/utils";

const actionIcons: Record<string, typeof Play> = {
	started: Play,
	stopped: Square,
	restarted: RefreshCw,
	installed: Download,
	uninstalled: Trash2,
	backup_triggered: Archive,
	backup_deleted: Trash2,
	config_updated: Settings,
};

export default function ActivitySidebar({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: items, isPending } = useActivity();
	const navigate = useNavigate();

	function handleClick(item: ActivityItem) {
		onOpenChange(false);
		navigate({ to: item.route });
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex flex-col gap-0 p-0">
				<SheetHeader className="border-b border-border/50 px-4 py-3">
					<SheetTitle className="flex items-center gap-2 text-base">
						<History className="size-4" />
						{m.activity_title()}
					</SheetTitle>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto">
					{isPending ? (
						<div className="flex flex-col gap-3 p-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<div key={i} className="flex items-start gap-3">
									<Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
									<div className="flex-1 space-y-1.5">
										<Skeleton className="h-3.5 w-3/4" />
										<Skeleton className="h-3 w-1/3" />
									</div>
								</div>
							))}
						</div>
					) : !items?.length ? (
						<div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-muted-foreground">
							<History className="size-8 opacity-40" />
							<p className="text-sm">{m.activity_noActivity()}</p>
						</div>
					) : (
						<ul className="flex flex-col">
							{items.map((item) => {
								const Icon = actionIcons[item.action] ?? History;
								return (
									<li key={item.id}>
										<button
											type="button"
											onClick={() => handleClick(item)}
											className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-muted/50"
										>
											<Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium">
													{item.title}
												</p>
												<p className="text-xs text-muted-foreground">
													{formatRelativeTime(item.createdAt)}
												</p>
											</div>
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}

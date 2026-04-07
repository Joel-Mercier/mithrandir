import { useNavigate } from "@tanstack/react-router";
import {
	Archive,
	CheckCircle,
	Download,
	FolderPlus,
	History,
	Play,
	RefreshCw,
	Settings,
	Square,
	Trash2,
	Upload,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import { ScrollArea } from "#/components/ui/scroll-area";
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

// biome-ignore lint/suspicious/noExplicitAny: paraglide message functions have varying signatures
const activityMessages: Record<string, (params?: any) => string> = {
	started: m.activity_started,
	stopped: m.activity_stopped,
	restarted: m.activity_restarted,
	installed: m.activity_installed,
	uninstalled: m.activity_uninstalled,
	backup_triggered: m.activity_backup_triggered,
	backup_deleted: m.activity_backup_deleted,
	config_updated: m.activity_config_updated,
	https_enabled: m.activity_https_enabled,
	https_disabled: m.activity_https_disabled,
	firewall_enabled: m.activity_firewall_enabled,
	firewall_disabled: m.activity_firewall_disabled,
	remote_added: m.activity_remote_added,
	remote_removed: m.activity_remote_removed,
	self_update: m.activity_self_update,
	setup_installed: m.activity_setup_installed,
	setup_basedir: m.activity_setup_basedir,
	setup_secrets: m.activity_setup_secrets,
	setup_https: m.activity_setup_https,
	setup_autosetup: m.activity_setup_autosetup,
	setup_firewall: m.activity_setup_firewall,
	setup_backup: m.activity_setup_backup,
	setup_completed: m.activity_setup_completed,
	setup_skipped: m.activity_setup_skipped,
	setup_resumed: m.activity_setup_resumed,
	uploaded: m.activity_uploaded,
	backup_verified: m.activity_backup_verified,
	created: m.activity_directory_created,
};

function getActivityTitle(action: string, targetName: string | null): string {
	const msgFn = activityMessages[action];
	if (!msgFn) return m.activity_unknown();
	return msgFn({ name: targetName ?? "" });
}

const actionIcons: Record<string, typeof Play> = {
	started: Play,
	stopped: Square,
	restarted: RefreshCw,
	installed: Download,
	uninstalled: Trash2,
	backup_triggered: Archive,
	backup_deleted: Trash2,
	config_updated: Settings,
	uploaded: Upload,
	backup_verified: CheckCircle,
	created: FolderPlus,
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
			<SheetContent side="right" className="flex flex-col gap-0 p-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
				<SheetHeader className="border-b border-border/50 px-4 py-3">
					<SheetTitle className="flex items-center gap-2 text-base">
						<History className="size-4" />
						{m.activity_title()}
					</SheetTitle>
				</SheetHeader>

				<ScrollArea className="flex-1">
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
										<Button
											variant="ghost"
											className="h-auto w-full justify-start gap-3 rounded-none px-4 py-3 text-left"
											onClick={() => handleClick(item)}
										>
											<Icon className="mt-0.5 shrink-0 text-muted-foreground" />
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium">
													{getActivityTitle(item.action, item.targetName)}
												</p>
												<p className="text-xs text-muted-foreground">
													{formatRelativeTime(item.createdAt)}
												</p>
											</div>
										</Button>
									</li>
								);
							})}
						</ul>
					)}
				</ScrollArea>
			</SheetContent>
		</Sheet>
	);
}

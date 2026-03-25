import { Download } from "lucide-react";
import { toast } from "sonner";
import { ExternalLinks } from "#/components/apps/ExternalLinks";
import Breadcrumbs from "#/components/Breadcrumbs";
import { Row } from "#/components/Row";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import { useInstallApp } from "#/hooks/homelab";
import type { AppStatus } from "#/lib/types";
import { m } from "#/paraglide/messages.js";

export function AvailableDetailPage({
	app,
}: {
	app: {
		name: string;
		displayName: string;
		description: string;
		port: number;
		status: AppStatus;
		category: string;
		icon?: string;
		website?: string;
		github?: string;
	};
}) {
	const installMutation = useInstallApp();

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />

			{/* Header */}
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					{app.icon && (
						<img src={app.icon} alt="" className="h-8 w-8 rounded" />
					)}
					<h1 className="font-display text-2xl font-bold tracking-tight">
						{app.displayName}
					</h1>
					<Badge
						variant="outline"
						className="bg-muted/50 text-muted-foreground border-dashed border-muted-foreground/30"
					>
						{m.common_available()}
					</Badge>
					<Badge variant="outline" className="capitalize">
						{app.category}
					</Badge>
				</div>
				<Button
					size="sm"
					className="gap-1.5"
					disabled={installMutation.isPending}
					onClick={() => {
						installMutation.mutate(app.name, {
							onSuccess: (result) => {
								if (result.success) {
									toast.success(
										m.apps_installedSuccess({ appName: app.displayName }),
									);
								} else {
									toast.error(
										m.apps_installError({ error: result.output.slice(0, 200) }),
									);
								}
							},
							onError: (err) =>
								toast.error(
									m.apps_installFailed({
										appName: app.displayName,
										error: err.message,
									}),
								),
						});
					}}
				>
					{installMutation.isPending ? (
						<Spinner size="sm" className="text-primary-foreground" />
					) : (
						<Download className="h-3.5 w-3.5" />
					)}
					{installMutation.isPending
						? m.common_installing()
						: m.common_install()}
				</Button>
			</div>

			<p className="mb-4 text-sm text-muted-foreground">{app.description}</p>

			<div className="mb-6">
				<ExternalLinks website={app.website} github={app.github} />
			</div>

			<Card className="max-w-md">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium">
						{m.appDetail_details()}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<Row label={m.appDetail_defaultPort()}>:{app.port}</Row>
					<Row label={m.appDetail_category()} mono={false}>
						{app.category}
					</Row>
				</CardContent>
			</Card>
		</div>
	);
}

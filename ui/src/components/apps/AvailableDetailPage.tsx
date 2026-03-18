import { Download } from "lucide-react";
import { toast } from "sonner";
import Breadcrumbs from "#/components/Breadcrumbs";
import { Row } from "#/components/Row";
import { ExternalLinks } from "#/components/apps/ExternalLinks";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import { useInstallApp } from "#/hooks/homelab";
import type { AppStatus } from "#/lib/types";

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
					<h1 className="font-display text-2xl font-bold tracking-tight">
						{app.displayName}
					</h1>
					<Badge
						variant="outline"
						className="bg-muted/50 text-muted-foreground border-dashed border-muted-foreground/30"
					>
						available
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
									toast.success(`${app.displayName} installed successfully.`);
								} else {
									toast.error(
										`Install finished with errors: ${result.output.slice(0, 200)}`,
									);
								}
							},
							onError: (err) =>
								toast.error(
									`Failed to install ${app.displayName}: ${err.message}`,
								),
						});
					}}
				>
					{installMutation.isPending ? (
						<Spinner size="sm" className="text-primary-foreground" />
					) : (
						<Download className="h-3.5 w-3.5" />
					)}
					{installMutation.isPending ? "Installing..." : "Install"}
				</Button>
			</div>

			<p className="mb-4 text-sm text-muted-foreground">{app.description}</p>

			<div className="mb-6">
				<ExternalLinks website={app.website} github={app.github} />
			</div>

			<Card className="max-w-md">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium">Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<Row label="Default port">:{app.port}</Row>
					<Row label="Category" mono={false}>
						{app.category}
					</Row>
				</CardContent>
			</Card>
		</div>
	);
}

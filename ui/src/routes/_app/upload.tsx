import { Link, createFileRoute } from "@tanstack/react-router";
import { FolderOpen } from "lucide-react";
import Breadcrumbs from "#/components/Breadcrumbs";
import { Button } from "#/components/ui/button";
import UploadPanel from "#/components/upload/UploadPanel";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_app/upload")({
	component: UploadPage,
});

function UploadPage() {
	return (
		<div className="mx-auto max-w-3xl px-4 py-6">
			<Breadcrumbs />
			<div className="mb-6 flex items-start justify-between gap-4">
				<div>
					<h1 className="font-display text-2xl font-bold tracking-tight">
						{m.upload_title()}
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{m.upload_subtitle()}
					</p>
				</div>
				<Button variant="outline" size="sm" asChild>
					<Link to="/media-library">
						<FolderOpen data-icon="inline-start" />
						{m.upload_browseLibrary()}
					</Link>
				</Button>
			</div>
			<UploadPanel />
		</div>
	);
}

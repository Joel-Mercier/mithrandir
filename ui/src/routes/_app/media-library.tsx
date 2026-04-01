import { createFileRoute } from "@tanstack/react-router";
import Breadcrumbs from "#/components/Breadcrumbs";
import MediaLibraryContent from "#/components/media-library/MediaLibraryContent";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_app/media-library")({
	component: MediaLibraryPage,
});

function MediaLibraryPage() {
	return (
		<div className="mx-auto max-w-7xl px-4 py-6">
			<Breadcrumbs />
			<div className="mb-6">
				<h1 className="font-display text-2xl font-bold tracking-tight">
					{m.mediaLibrary_title()}
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					{m.mediaLibrary_subtitle()}
				</p>
			</div>
			<MediaLibraryContent />
		</div>
	);
}

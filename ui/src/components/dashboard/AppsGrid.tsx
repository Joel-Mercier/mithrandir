import type { DashboardApp } from "#/lib/types";
import { m } from "#/paraglide/messages.js";
import AppCard from "./AppCard";

export default function AppsGrid({ apps }: { apps: DashboardApp[] }) {
	return (
		<div className="col-span-full space-y-3">
			<h2 className="text-sm font-medium text-muted-foreground">
				{m.appsGrid_title()}
			</h2>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{apps.map((app) => (
					<AppCard key={app.name} app={app} />
				))}
			</div>
		</div>
	);
}

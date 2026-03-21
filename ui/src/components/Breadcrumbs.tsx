import { Link, useMatches } from "@tanstack/react-router";
import { Fragment } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
	"/": "Dashboard",
	"/apps": "Apps",
	"/apps/graph": "Dependency Graph",
	"/apps/capacity": "Capacity",
	"/backup-restore": "Backup & Restore",
	"/settings": "Settings",
	"/profile": "Profile",
};

interface BreadcrumbEntry {
	label: string;
	path: string;
}

export default function Breadcrumbs() {
	const matches = useMatches();

	const crumbs: BreadcrumbEntry[] = [];
	for (const match of matches) {
		// Normalize trailing slashes so "/apps/" matches routeLabels["/apps"]
		const path = match.pathname.replace(/\/+$/, "") || "/";
		// Skip layout routes and root
		if (path === "/" || routeLabels[path]) {
			if (path !== "/") {
				// For nested known routes like /apps/graph, ensure parent crumb exists
				if ((path === "/apps/graph" || path === "/apps/capacity") && !crumbs.some((c) => c.path === "/apps")) {
					crumbs.push({ label: "Apps", path: "/apps" });
				}
				crumbs.push({ label: routeLabels[path], path });
			}
		} else if (path.startsWith("/apps/")) {
			// Dynamic app detail route — extract app name
			const appName = path.replace("/apps/", "");
			if (appName) {
				if (!crumbs.some((c) => c.path === "/apps")) {
					crumbs.push({ label: "Apps", path: "/apps" });
				}
				crumbs.push({
					label: appName.charAt(0).toUpperCase() + appName.slice(1),
					path,
				});
			}
		}
	}

	if (crumbs.length === 0) return null;

	return (
		<Breadcrumb className="mb-4">
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link to="/">Dashboard</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				{crumbs.map((crumb, i) => {
					const isLast = i === crumbs.length - 1;
					return (
						<Fragment key={crumb.path}>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								{isLast ? (
									<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
								) : (
									<BreadcrumbLink asChild>
										<Link to={crumb.path}>{crumb.label}</Link>
									</BreadcrumbLink>
								)}
							</BreadcrumbItem>
						</Fragment>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}

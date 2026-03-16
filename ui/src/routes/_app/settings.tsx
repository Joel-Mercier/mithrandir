import { createFileRoute } from "@tanstack/react-router";
import { Archive, Globe, Settings, Info } from "lucide-react";
import { useState } from "react";
import Breadcrumbs from "#/components/Breadcrumbs";
import {
	GeneralTab,
	NetworkTab,
	BackupTab,
	AboutTab,
} from "#/components/settings/SettingsTabs";

export const Route = createFileRoute("/_app/settings")({
	component: SettingsPage,
});

const tabs = [
	{ id: "general", label: "General", icon: Settings },
	{ id: "network", label: "Network", icon: Globe },
	{ id: "backup", label: "Backup", icon: Archive },
	{ id: "about", label: "About", icon: Info },
] as const;

type TabId = (typeof tabs)[number]["id"];

function SettingsPage() {
	const [activeTab, setActiveTab] = useState<TabId>("general");

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />
			<div className="mb-6">
				<h1 className="font-display text-2xl font-bold tracking-tight">
					Settings
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					System configuration and preferences
				</p>
			</div>

			<div className="flex flex-col gap-6 md:flex-row">
				{/* Sidebar nav */}
				<nav className="flex shrink-0 flex-row gap-1 md:w-48 md:flex-col">
					{tabs.map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
									isActive
										? "bg-accent text-accent-foreground shadow-sm"
										: "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
								}`}
							>
								<Icon
									className={`h-4 w-4 transition-colors ${
										isActive
											? "text-foreground"
											: "text-muted-foreground/70 group-hover:text-foreground"
									}`}
								/>
								<span className="hidden md:inline">{tab.label}</span>
							</button>
						);
					})}
				</nav>

				{/* Content */}
				<div className="flex-1">
					{activeTab === "general" && <GeneralTab />}
					{activeTab === "network" && <NetworkTab />}
					{activeTab === "backup" && <BackupTab />}
					{activeTab === "about" && <AboutTab />}
				</div>
			</div>
		</div>
	);
}

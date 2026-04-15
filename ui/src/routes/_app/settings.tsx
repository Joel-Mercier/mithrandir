import { createFileRoute } from "@tanstack/react-router";
import { Archive, Globe, Info, Settings } from "lucide-react";
import Breadcrumbs from "#/components/Breadcrumbs";
import {
	AboutTab,
	BackupTab,
	GeneralTab,
	NetworkTab,
} from "#/components/settings/SettingsTabs";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "#/components/ui/tabs";
import { useMediaQuery } from "#/hooks/use-media-query";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_app/settings")({
	component: SettingsPage,
});

const tabs = [
	{ id: "general", label: m.settings_tabGeneral(), icon: Settings },
	{ id: "network", label: m.settings_tabNetwork(), icon: Globe },
	{ id: "backup", label: m.settings_tabBackup(), icon: Archive },
	{ id: "about", label: m.settings_tabAbout(), icon: Info },
];

function SettingsPage() {
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const orientation = isDesktop ? "vertical" : "horizontal";

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />
			<div className="mb-6">
				<h1 className="font-display text-2xl font-bold tracking-tight">
					{m.settings_title()}
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					{m.settings_subtitle()}
				</p>
			</div>

			<Tabs defaultValue="general" orientation={orientation}>
				<TabsList variant="line" className="w-full overflow-x-auto scrollbar-none md:w-48 md:shrink-0">
					{tabs.map((tab) => {
						const Icon = tab.icon;
						return (
							<TabsTrigger key={tab.id} value={tab.id}>
								<Icon />
								{tab.label}
							</TabsTrigger>
						);
					})}
				</TabsList>

				<TabsContent value="general">
					<GeneralTab />
				</TabsContent>
				<TabsContent value="network">
					<NetworkTab />
				</TabsContent>
				<TabsContent value="backup">
					<BackupTab />
				</TabsContent>
				<TabsContent value="about">
					<AboutTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}

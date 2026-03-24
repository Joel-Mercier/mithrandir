import {
	ChevronDown,
	Cloud,
	Cog,
	Film,
	Heart,
	LineChart,
	Loader2,
	Lock,
	MonitorSmartphone,
	Plane,
	Search,
	Sparkles,
	Wallet,
	Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Card, CardContent } from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { useAppRegistry, useResolveAppDependencies } from "#/hooks/homelab";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";
import type { SetupState } from "../SetupWizard";
import { StepNavigation } from "../StepNavigation";

interface AppSelectStepProps {
	state: SetupState;
	updateState: (updates: Partial<SetupState>) => void;
	onComplete: () => void;
	onBack: () => void;
}

const CATEGORY_ICONS: Record<string, typeof Film> = {
	media: Film,
	automation: Cog,
	monitoring: MonitorSmartphone,
	productivity: Sparkles,
	finance: Wallet,
	security: Lock,
	travel: Plane,
	statistics: LineChart,
	household: Heart,
	utilities: Wrench,
};

export function AppSelectStep({
	state,
	updateState,
	onComplete,
	onBack,
}: AppSelectStepProps) {
	const [showCustomize, setShowCustomize] = useState(false);
	const [search, setSearch] = useState("");

	const { data: registry, isLoading } = useAppRegistry();
	const resolveDeps = useResolveAppDependencies();

	const categories = useMemo(() => {
		if (!registry) return [];
		return registry.categories.map((cat) => ({
			id: cat.value,
			label: cat.label,
			icon: CATEGORY_ICONS[cat.value] ?? Wrench,
			description: cat.description,
			apps: cat.apps,
		}));
	}, [registry]);

	const allApps = useMemo(() => {
		if (!registry)
			return {} as Record<string, { displayName: string; description: string }>;
		const result: Record<string, { displayName: string; description: string }> =
			{};
		for (const app of registry.apps) {
			if (app.hidden) continue;
			result[app.name] = {
				displayName: app.displayName,
				description: app.description,
			};
		}
		return result;
	}, [registry]);

	// Resolve dependencies when selection changes
	useEffect(() => {
		if (state.selectedApps.length === 0) {
			updateState({ resolvedApps: [], autoAddedDeps: [] });
			return;
		}
		resolveDeps.mutate(
			{ selectedApps: state.selectedApps, httpsEnabled: state.httpsEnabled },
			{
				onSuccess: (result) => {
					updateState({
						resolvedApps: result.resolved,
						autoAddedDeps: result.autoAdded,
					});
				},
			},
		);
	}, [state.selectedApps, state.httpsEnabled, resolveDeps.mutate, updateState]);

	const toggleCategory = (categoryId: string) => {
		const category = categories.find((c) => c.id === categoryId);
		if (!category) return;

		const isSelected = state.selectedCategories.includes(categoryId);
		const newCategories = isSelected
			? state.selectedCategories.filter((c) => c !== categoryId)
			: [...state.selectedCategories, categoryId];

		// Update apps based on categories
		let newApps = [...state.selectedApps];
		if (isSelected) {
			newApps = newApps.filter((a) => !category.apps.includes(a));
		} else {
			for (const app of category.apps) {
				if (!newApps.includes(app)) newApps.push(app);
			}
		}

		updateState({
			selectedCategories: newCategories,
			selectedApps: newApps,
		});
	};

	const toggleApp = (appName: string) => {
		const newApps = state.selectedApps.includes(appName)
			? state.selectedApps.filter((a) => a !== appName)
			: [...state.selectedApps, appName];
		updateState({ selectedApps: newApps });
	};

	const filteredApps = Object.entries(allApps).filter(
		([, app]) =>
			!search ||
			app.displayName.toLowerCase().includes(search.toLowerCase()) ||
			app.description.toLowerCase().includes(search.toLowerCase()),
	);

	if (isLoading) {
		return (
			<div>
				<h2 className="font-display text-2xl font-bold tracking-tight">
					{m.appSelect_title()}
				</h2>
				<div className="mt-8 flex items-center gap-3 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin" />
					<span>{m.appSelect_loadingRegistry()}</span>
				</div>
			</div>
		);
	}

	return (
		<div>
			<h2 className="font-display text-2xl font-bold tracking-tight">
				{m.appSelect_title()}
			</h2>
			<p className="mt-2 text-muted-foreground">{m.appSelect_subtitle()}</p>

			{/* Category grid */}
			<div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
				{categories.map((category) => {
					const Icon = category.icon;
					const isSelected = state.selectedCategories.includes(category.id);

					return (
						<Card
							key={category.id}
							className={cn(
								"cursor-pointer transition-colors",
								isSelected && "border-primary bg-primary/5",
							)}
							onClick={() => toggleCategory(category.id)}
						>
							<CardContent className="flex items-start gap-3 p-4">
								<Checkbox
									checked={isSelected}
									className="mt-0.5"
									onClick={(e) => e.stopPropagation()}
									onCheckedChange={() => toggleCategory(category.id)}
								/>
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<Icon className="h-4 w-4 text-muted-foreground" />
										<span className="text-sm font-medium">
											{category.label}
										</span>
									</div>
									<p className="mt-1 text-xs text-muted-foreground">
										{category.description}
									</p>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Customize section */}
			<div className="mt-6">
				<button
					type="button"
					onClick={() => setShowCustomize(!showCustomize)}
					className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
				>
					<ChevronDown
						className={cn(
							"h-4 w-4 transition-transform",
							showCustomize && "rotate-180",
						)}
					/>
					{m.appSelect_customize({ count: String(state.selectedApps.length) })}
				</button>

				{showCustomize && (
					<div className="mt-4 space-y-4">
						<div className="relative max-w-xs">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder={m.appSelect_searchPlaceholder()}
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9"
							/>
						</div>

						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
							{filteredApps.map(([name, app]) => {
								const isSelected = state.selectedApps.includes(name);
								return (
									<button
										type="button"
										key={name}
										className={cn(
											"flex w-full cursor-pointer items-center gap-2 rounded-lg border p-3 text-left transition-colors",
											isSelected
												? "border-primary bg-primary/5"
												: "border-border hover:border-border/80",
										)}
										onClick={() => toggleApp(name)}
									>
										<Checkbox
											checked={isSelected}
											onClick={(e) => e.stopPropagation()}
											onCheckedChange={() => toggleApp(name)}
										/>
										<div className="min-w-0">
											<p className="text-sm font-medium leading-tight">
												{app.displayName}
											</p>
											<p className="text-xs text-muted-foreground">
												{app.description}
											</p>
										</div>
									</button>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{/* Auto-added dependencies alert */}
			{state.autoAddedDeps.length > 0 && (
				<Alert className="mt-6">
					<Cloud className="h-4 w-4" />
					<AlertDescription>
						{m.appSelect_autoDeps({ deps: state.autoAddedDeps.join(", ") })}
					</AlertDescription>
				</Alert>
			)}

			<StepNavigation
				onBack={onBack}
				onNext={onComplete}
				nextDisabled={state.selectedApps.length === 0}
			/>
		</div>
	);
}

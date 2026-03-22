import { useEffect, useRef, useState } from "react";
import {
	Check,
	Info,
	SkipForward,
	AlertTriangle,
	ChevronRight,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { Spinner } from "#/components/ui/spinner";
import { cn } from "#/lib/utils";
import { useAutoSetupApp } from "#/hooks/homelab";
import { StepNavigation } from "../StepNavigation";
import type { AppSetupResult, SetupState } from "../SetupWizard";

interface AutoSetupStepProps {
	state: SetupState;
	updateState: (updates: Partial<SetupState>) => void;
	onComplete: () => void;
	onBack: () => void;
}

// Per-app configuration prompts — mirrors what the CLI asks during auto-setup
interface AppPrompt {
	key: string;
	label: string;
	description: string;
	type: "text" | "password" | "number";
	defaultValue?: string;
}

interface AutoSetupApp {
	name: string;
	displayName: string;
	prompts: AppPrompt[];
}

// Apps that support auto-setup via server API calls
const AUTO_SETUP_APP_NAMES = [
	"qbittorrent",
	"prowlarr",
	"radarr",
	"sonarr",
	"lidarr",
	"jellyfin",
	"jellyseerr",
	"gatus",
] as const;

// Per-app UI prompts — defines what fields to show during the per-app phase
const AUTO_SETUP_APPS: AutoSetupApp[] = [
	{
		name: "qbittorrent",
		displayName: "qBittorrent",
		prompts: [
			{
				key: "qbittorrent_username",
				label: "Username",
				description: "WebUI username",
				type: "text",
				defaultValue: "admin",
			},
			{
				key: "qbittorrent_password",
				label: "Password",
				description: "WebUI password",
				type: "password",
			},
			{
				key: "qbittorrent_download_path",
				label: "Download path",
				description: "Where downloads are saved",
				type: "text",
				defaultValue: "/media/downloads",
			},
		],
	},
	{
		name: "prowlarr",
		displayName: "Prowlarr",
		prompts: [
			{
				key: "prowlarr_username",
				label: "Username",
				description: "Admin account for Prowlarr",
				type: "text",
				defaultValue: "admin",
			},
			{
				key: "prowlarr_password",
				label: "Password",
				description: "Admin password for Prowlarr",
				type: "password",
			},
		],
	},
	{
		name: "radarr",
		displayName: "Radarr",
		prompts: [
			{
				key: "radarr_username",
				label: "Username",
				description: "Admin account for Radarr",
				type: "text",
				defaultValue: "admin",
			},
			{
				key: "radarr_password",
				label: "Password",
				description: "Admin password for Radarr",
				type: "password",
			},
			{
				key: "radarr_root_folder",
				label: "Root folder",
				description: "Path where movies are stored",
				type: "text",
				defaultValue: "/media/movies",
			},
		],
	},
	{
		name: "sonarr",
		displayName: "Sonarr",
		prompts: [
			{
				key: "sonarr_username",
				label: "Username",
				description: "Admin account for Sonarr",
				type: "text",
				defaultValue: "admin",
			},
			{
				key: "sonarr_password",
				label: "Password",
				description: "Admin password for Sonarr",
				type: "password",
			},
			{
				key: "sonarr_root_folder",
				label: "Root folder",
				description: "Path where TV shows are stored",
				type: "text",
				defaultValue: "/media/tv",
			},
		],
	},
	{
		name: "lidarr",
		displayName: "Lidarr",
		prompts: [
			{
				key: "lidarr_username",
				label: "Username",
				description: "Admin account for Lidarr",
				type: "text",
				defaultValue: "admin",
			},
			{
				key: "lidarr_password",
				label: "Password",
				description: "Admin password for Lidarr",
				type: "password",
			},
			{
				key: "lidarr_root_folder",
				label: "Root folder",
				description: "Path where music is stored",
				type: "text",
				defaultValue: "/media/music",
			},
		],
	},
	{
		name: "jellyfin",
		displayName: "Jellyfin",
		prompts: [
			{
				key: "jellyfin_username",
				label: "Username",
				description: "Admin account for Jellyfin",
				type: "text",
				defaultValue: "admin",
			},
			{
				key: "jellyfin_password",
				label: "Password",
				description: "Admin password for Jellyfin",
				type: "password",
			},
		],
	},
	{
		name: "jellyseerr",
		displayName: "Jellyseerr",
		prompts: [
			{
				key: "jellyseerr_email",
				label: "Email",
				description: "Admin email for Jellyseerr",
				type: "text",
			},
			{
				key: "jellyseerr_password",
				label: "Password",
				description: "Admin password for Jellyseerr",
				type: "password",
			},
		],
	},
	{
		name: "gatus",
		displayName: "Gatus",
		prompts: [],
	},
];

type Phase = "credentials" | "per-app" | "running" | "done";

export function AutoSetupStep({
	state,
	updateState,
	onComplete,
	onBack,
}: AutoSetupStepProps) {
	const [phase, setPhase] = useState<Phase>("credentials");
	const [currentAppIdx, setCurrentAppIdx] = useState(0);
	const [appValues, setAppValues] = useState<Record<string, string>>({});
	const [skippedApps, setSkippedApps] = useState<Set<string>>(new Set());
	const onCompleteRef = useRef(onComplete);
	onCompleteRef.current = onComplete;
	const autoSetupMutation = useAutoSetupApp();

	// Determine which selected apps support auto-setup
	const allApps = [
		...new Set([
			...state.selectedApps,
			...state.resolvedApps,
			...state.autoAddedDeps,
		]),
	];
	const setupApps = AUTO_SETUP_APPS.filter((a) =>
		allApps.some(
			(selected) =>
				selected === a.name &&
				AUTO_SETUP_APP_NAMES.includes(
					a.name as (typeof AUTO_SETUP_APP_NAMES)[number],
				),
		),
	);

	// Apps that have per-app prompts (skip those with no prompts in per-app phase)
	const setupAppsWithPrompts = setupApps.filter(
		(a) => a.prompts.length > 0,
	);

	// Skip if no apps support auto-setup
	const setupAppsCount = setupApps.length;
	useEffect(() => {
		if (setupAppsCount === 0) {
			onCompleteRef.current();
		}
	}, [setupAppsCount]);

	if (setupApps.length === 0) return null;

	// Initialize default values for prompts
	const getPromptValue = (key: string, defaultValue?: string) =>
		appValues[key] ?? defaultValue ?? "";

	const setPromptValue = (key: string, value: string) =>
		setAppValues((prev) => ({ ...prev, [key]: value }));

	// Check if current app's required fields are filled
	const currentApp = setupAppsWithPrompts[currentAppIdx];
	const currentAppFilled =
		currentApp?.prompts.every(
			(p) => getPromptValue(p.key, p.defaultValue).trim() !== "",
		) ?? false;

	const handleStartPerApp = () => {
		if (
			!state.autoSetupCredentials.username.trim() ||
			!state.autoSetupCredentials.password.trim()
		) {
			return;
		}
		// Pre-fill per-app usernames/passwords from shared credentials
		const prefilled: Record<string, string> = {};
		for (const app of setupAppsWithPrompts) {
			for (const prompt of app.prompts) {
				if (
					prompt.key.endsWith("_username") &&
					!prefilled[prompt.key]
				) {
					prefilled[prompt.key] =
						prompt.defaultValue ?? state.autoSetupCredentials.username;
				}
				if (
					prompt.key.endsWith("_password") &&
					!prefilled[prompt.key]
				) {
					prefilled[prompt.key] =
						state.autoSetupCredentials.password;
				}
			}
		}
		setAppValues((prev) => ({ ...prefilled, ...prev }));
		setCurrentAppIdx(0);

		if (setupAppsWithPrompts.length === 0) {
			// No per-app prompts needed, go straight to running
			runAutoSetup([]);
		} else {
			setPhase("per-app");
		}
	};

	const handleConfirmApp = () => {
		if (currentAppIdx < setupAppsWithPrompts.length - 1) {
			setCurrentAppIdx(currentAppIdx + 1);
		} else {
			// All per-app prompts done, start running auto-setup
			runAutoSetup(skippedApps);
		}
	};

	const handleSkipApp = () => {
		if (currentApp) {
			setSkippedApps((prev) => new Set([...prev, currentApp.name]));
		}

		if (currentAppIdx < setupAppsWithPrompts.length - 1) {
			setCurrentAppIdx(currentAppIdx + 1);
		} else {
			// All per-app prompts done (or skipped), start running
			const newSkipped = new Set([...skippedApps]);
			if (currentApp) newSkipped.add(currentApp.name);
			runAutoSetup(newSkipped);
		}
	};

	const runAutoSetup = async (skipped: Set<string> | string[]) => {
		const skippedSet =
			skipped instanceof Set ? skipped : new Set(skipped);
		setPhase("running");

		// Initialize results: all non-skipped as pending, skipped as skipped
		const initialResults: AppSetupResult[] = setupApps.map((app) => ({
			name: app.name,
			displayName: app.displayName,
			status: skippedSet.has(app.name) ? "skipped" : "pending",
		}));
		updateState({ autoSetupResults: initialResults });

		const results = [...initialResults];
		const { username, password } = state.autoSetupCredentials;

		for (let i = 0; i < setupApps.length; i++) {
			const app = setupApps[i];
			if (skippedSet.has(app.name)) continue;

			// Mark as configuring
			results[i] = { ...results[i], status: "configuring" };
			updateState({ autoSetupResults: [...results] });

			try {
				// Collect per-app settings from appValues
				const settings: Record<string, string> = {};
				for (const prompt of app.prompts) {
					const value = getPromptValue(prompt.key, prompt.defaultValue);
					if (value) settings[prompt.key] = value;
				}

				const result = await autoSetupMutation.mutateAsync({
					appName: app.name,
					credentials: { username, password },
					selectedApps: allApps,
					settings,
				});

				if (result.success) {
					results[i] = {
						...results[i],
						status:
							result.warnings && result.warnings.length > 0
								? "warning"
								: "done",
						warning: result.warnings?.join("; "),
					};
				} else {
					results[i] = {
						...results[i],
						status: "warning",
						warning: result.error ?? "Setup failed",
					};
				}
			} catch (err) {
				results[i] = {
					...results[i],
					status: "warning",
					warning:
						err instanceof Error ? err.message : "Setup failed",
				};
			}

			updateState({ autoSetupResults: [...results] });
		}

		setPhase("done");
	};

	return (
		<div>
			<h2 className="font-display text-2xl font-bold tracking-tight">
				Auto-Configure Apps
			</h2>
			<p className="mt-2 text-muted-foreground">
				Configure each app with credentials and settings. Shared defaults
				are pre-filled from your username and password.
			</p>

			{/* Phase 1: Shared credentials */}
			{phase === "credentials" && (
				<>
					<Card className="mt-8">
						<CardContent className="flex items-start gap-3 p-4">
							<Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
							<div className="text-sm text-muted-foreground">
								<p>
									Enter shared credentials below. These will be used as
									defaults for each app — you can customize per-app
									settings in the next screens.
								</p>
							</div>
						</CardContent>
					</Card>

					<div className="mt-6 space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="setup-username">Shared username</Label>
							<Input
								id="setup-username"
								value={state.autoSetupCredentials.username}
								onChange={(e) =>
									updateState({
										autoSetupCredentials: {
											...state.autoSetupCredentials,
											username: e.target.value,
										},
									})
								}
								placeholder="admin"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="setup-password">Shared password</Label>
							<Input
								id="setup-password"
								type="password"
								value={state.autoSetupCredentials.password}
								onChange={(e) =>
									updateState({
										autoSetupCredentials: {
											...state.autoSetupCredentials,
											password: e.target.value,
										},
									})
								}
								placeholder="Choose a strong password"
							/>
						</div>
					</div>

					<div className="mt-6 flex items-center gap-3">
						<Button
							onClick={handleStartPerApp}
							disabled={
								!state.autoSetupCredentials.username.trim() ||
								!state.autoSetupCredentials.password.trim()
							}
							className="gap-2"
						>
							Configure Apps
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							onClick={onComplete}
							className="gap-2"
						>
							<SkipForward className="h-4 w-4" />
							Skip all
						</Button>
					</div>
				</>
			)}

			{/* Phase 2: Per-app configuration */}
			{phase === "per-app" && currentApp && (
				<>
					{/* Progress bar showing which app we're on */}
					<div className="mt-8 flex items-center gap-2">
						{setupAppsWithPrompts.map((app, i) => (
							<div key={app.name} className="flex items-center gap-2">
								{i > 0 && (
									<div
										className={cn(
											"h-0.5 w-4",
											i <= currentAppIdx
												? "bg-primary"
												: "bg-border",
										)}
									/>
								)}
								<div
									className={cn(
										"flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
										i < currentAppIdx &&
											"bg-primary text-primary-foreground",
										i === currentAppIdx &&
											"bg-primary text-primary-foreground ring-2 ring-primary/20",
										i > currentAppIdx &&
											"border border-muted-foreground/30 text-muted-foreground/40",
									)}
								>
									{i < currentAppIdx ? (
										<Check className="h-3 w-3" />
									) : (
										i + 1
									)}
								</div>
							</div>
						))}
						<span className="ml-2 text-xs text-muted-foreground">
							{currentAppIdx + 1} of {setupAppsWithPrompts.length}
						</span>
					</div>

					{/* App config card */}
					<Card
						key={currentApp.name}
						className="mt-6 animate-in fade-in-0 duration-200"
					>
						<CardHeader className="pb-3">
							<h3 className="text-base font-semibold">
								{currentApp.displayName}
							</h3>
							<p className="text-xs text-muted-foreground">
								Configure credentials and settings for{" "}
								{currentApp.displayName}
							</p>
						</CardHeader>
						<CardContent className="space-y-4">
							{currentApp.prompts.map((prompt, promptIdx) => (
								<div key={prompt.key}>
									{promptIdx > 0 &&
										prompt.key.endsWith("_root_folder") && (
											<Separator className="mb-4" />
										)}
									<div className="space-y-1.5">
										<Label htmlFor={prompt.key}>
											{prompt.label}
										</Label>
										<Input
											id={prompt.key}
											type={prompt.type}
											value={getPromptValue(
												prompt.key,
												prompt.defaultValue,
											)}
											onChange={(e) =>
												setPromptValue(
													prompt.key,
													e.target.value,
												)
											}
											placeholder={prompt.description}
										/>
										<p className="text-xs text-muted-foreground">
											{prompt.description}
										</p>
									</div>
								</div>
							))}
						</CardContent>
					</Card>

					<div className="mt-6 flex items-center justify-between">
						<Button
							variant="ghost"
							onClick={handleSkipApp}
							className="gap-2 text-muted-foreground"
						>
							<SkipForward className="h-4 w-4" />
							Skip {currentApp.displayName}
						</Button>
						<Button
							onClick={handleConfirmApp}
							disabled={!currentAppFilled}
							className="gap-2"
						>
							{currentAppIdx < setupAppsWithPrompts.length - 1
								? "Next App"
								: "Run Auto-Setup"}
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</>
			)}

			{/* Phase 3: Running — live progress */}
			{phase === "running" && (
				<div className="mt-8 space-y-3">
					{state.autoSetupResults.map((app) => (
						<div
							key={app.name}
							className="flex items-center gap-3 rounded-lg border border-border/50 p-3"
						>
							<div className="flex h-6 w-6 shrink-0 items-center justify-center">
								{app.status === "done" && (
									<Check className="h-4 w-4 text-status-healthy" />
								)}
								{app.status === "skipped" && (
									<SkipForward className="h-4 w-4 text-muted-foreground" />
								)}
								{app.status === "warning" && (
									<AlertTriangle className="h-4 w-4 text-status-warning" />
								)}
								{app.status === "configuring" && (
									<Spinner size="sm" />
								)}
								{app.status === "pending" && (
									<div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
								)}
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-sm font-medium">
									{app.displayName}
								</p>
								{app.status === "configuring" && (
									<p className="text-xs text-muted-foreground">
										Configuring...
									</p>
								)}
								{app.warning && (
									<p className="text-xs text-status-warning">
										{app.warning}
									</p>
								)}
							</div>
							<span
								className={cn(
									"text-xs",
									app.status === "done" && "text-status-healthy",
									app.status === "skipped" &&
										"text-muted-foreground",
									app.status === "configuring" &&
										"text-muted-foreground",
								)}
							>
								{app.status === "done" && "Configured"}
								{app.status === "skipped" && "Skipped"}
								{app.status === "warning" && "Warning"}
								{app.status === "configuring" && "Setting up..."}
							</span>
						</div>
					))}
				</div>
			)}

			{/* Phase 4: Done — show results summary */}
			{phase === "done" && (
				<>
					<div className="mt-8 space-y-3">
						{state.autoSetupResults.map((app) => (
							<div
								key={app.name}
								className="flex items-center gap-3 rounded-lg border border-border/50 p-3"
							>
								<div className="flex h-6 w-6 shrink-0 items-center justify-center">
									{app.status === "done" && (
										<Check className="h-4 w-4 text-status-healthy" />
									)}
									{app.status === "skipped" && (
										<SkipForward className="h-4 w-4 text-muted-foreground" />
									)}
									{app.status === "warning" && (
										<AlertTriangle className="h-4 w-4 text-status-warning" />
									)}
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium">
										{app.displayName}
									</p>
									{app.warning && (
										<p className="text-xs text-status-warning">
											{app.warning}
										</p>
									)}
								</div>
								<span
									className={cn(
										"text-xs",
										app.status === "done" && "text-status-healthy",
										app.status === "skipped" &&
											"text-muted-foreground",
									)}
								>
									{app.status === "done" && "Configured"}
									{app.status === "skipped" && "Skipped"}
									{app.status === "warning" && "Warning"}
								</span>
							</div>
						))}
					</div>

					<StepNavigation
						onBack={onBack}
						onNext={onComplete}
						nextLabel="Continue"
					/>
				</>
			)}
		</div>
	);
}

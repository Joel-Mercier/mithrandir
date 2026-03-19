import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { Progress } from "#/components/ui/progress";
import { Spinner } from "#/components/ui/spinner";
import { cn } from "#/lib/utils";
import { StepNavigation } from "../StepNavigation";
import type { AppProgress, SetupState } from "../SetupWizard";

interface InstallStepProps {
	state: SetupState;
	updateState: (updates: Partial<SetupState>) => void;
	onComplete: () => void;
	onBack: () => void;
}

// Placeholder app display names
const APP_NAMES: Record<string, string> = {
	jellyfin: "Jellyfin",
	sonarr: "Sonarr",
	radarr: "Radarr",
	lidarr: "Lidarr",
	prowlarr: "Prowlarr",
	qbittorrent: "qBittorrent",
	jellyseerr: "Jellyseerr",
	homeassistant: "Home Assistant",
	uptimekuma: "Uptime Kuma",
	pihole: "Pi-hole",
	wireguard: "WireGuard",
	vaultwarden: "Vaultwarden",
	homarr: "Homarr",
	duckdns: "DuckDNS",
	affine: "AFFiNE",
	paperlessngx: "Paperless-ngx",
	stirlingpdf: "Stirling PDF",
	actualbudget: "Actual Budget",
	adventurelog: "AdventureLog",
	yourspotify: "Your Spotify",
	tautulli: "Tautulli",
	mealie: "Mealie",
	homebox: "Homebox",
	nodered: "Node-RED",
	glances: "Glances",
};

function phaseLabel(phase: AppProgress["phase"]): string {
	switch (phase) {
		case "pulling":
			return "Pulling image...";
		case "starting":
			return "Starting container...";
		case "done":
			return "Installed";
		case "error":
			return "Failed";
	}
}

export function InstallStep({
	state,
	updateState,
	onComplete,
	onBack,
}: InstallStepProps) {
	// Refs to hold latest callbacks without triggering effect re-runs
	const updateStateRef = useRef(updateState);
	updateStateRef.current = updateState;
	const onCompleteRef = useRef(onComplete);
	onCompleteRef.current = onComplete;

	// Capture selected apps once on mount — don't re-run if parent re-renders
	const appsRef = useRef(state.selectedApps);

	// Simulate installation progress
	useEffect(() => {
		const apps = appsRef.current;
		if (apps.length === 0) {
			onCompleteRef.current();
			return;
		}

		// Initialize all apps as pulling
		const initial: AppProgress[] = apps.map((name) => ({
			name,
			displayName: APP_NAMES[name] ?? name,
			phase: "pulling",
			pullPercent: 0,
		}));
		updateStateRef.current({ installProgress: initial });

		// Simulate sequential installation
		let idx = 0;
		let cancelled = false;
		const interval = setInterval(() => {
			if (cancelled) return;

			updateStateRef.current({
				installProgress: apps.map((name, i) => {
					const displayName = APP_NAMES[name] ?? name;
					if (i < idx) {
						return { name, displayName, phase: "done" };
					}
					if (i === idx) {
						return {
							name,
							displayName,
							phase: "starting",
							pullPercent: 100,
						};
					}
					return { name, displayName, phase: "pulling", pullPercent: 0 };
				}),
			});

			idx++;
			if (idx > apps.length) {
				cancelled = true;
				clearInterval(interval);
				updateStateRef.current({
					installProgress: apps.map((name) => ({
						name,
						displayName: APP_NAMES[name] ?? name,
						phase: "done",
					})),
				});
			}
		}, 600);

		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, []); // empty deps — runs once, uses refs for latest values

	const doneCount = state.installProgress.filter(
		(p) => p.phase === "done",
	).length;
	const total = state.installProgress.length;
	const overallPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

	return (
		<div>
			<h2 className="font-display text-2xl font-bold tracking-tight">
				Installing Applications
			</h2>
			<p className="mt-2 text-muted-foreground">
				Pulling images and starting containers. This may take a few minutes.
			</p>

			{/* Overall progress */}
			<div className="mt-8">
				<div className="mb-2 flex items-center justify-between text-sm">
					<span className="text-muted-foreground">
						Installing apps ({doneCount}/{total})
					</span>
					<span className="font-mono-data text-xs text-muted-foreground">
						{overallPercent}%
					</span>
				</div>
				<Progress value={overallPercent} />
			</div>

			{/* Per-app progress */}
			<div className="mt-6 space-y-3">
				{state.installProgress.map((app) => (
					<div
						key={app.name}
						className="flex items-center gap-3 rounded-lg border border-border/50 p-3"
					>
						{/* Status icon */}
						<div className="flex h-6 w-6 shrink-0 items-center justify-center">
							{app.phase === "done" && (
								<Check className="h-4 w-4 text-status-healthy" />
							)}
							{app.phase === "error" && (
								<X className="h-4 w-4 text-destructive" />
							)}
							{(app.phase === "pulling" || app.phase === "starting") && (
								<Spinner size="sm" />
							)}
						</div>

						{/* App info */}
						<div className="min-w-0 flex-1">
							<div className="flex items-baseline justify-between">
								<p className="text-sm font-medium">{app.displayName}</p>
								<span
									className={cn(
										"text-xs",
										app.phase === "done" && "text-status-healthy",
										app.phase === "error" && "text-destructive",
										(app.phase === "pulling" ||
											app.phase === "starting") &&
											"text-muted-foreground",
									)}
								>
									{phaseLabel(app.phase)}
								</span>
							</div>

							{/* Pull progress bar */}
							{app.phase === "pulling" &&
								app.pullPercent !== undefined && (
									<Progress
										value={app.pullPercent}
										className="mt-1.5 h-1"
									/>
								)}

							{/* Error message */}
							{app.phase === "error" && app.error && (
								<p className="mt-1 text-xs text-destructive">
									{app.error}
								</p>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Navigation — only shown once all installs finish */}
			{total > 0 && doneCount === total && (
				<StepNavigation
					onBack={onBack}
					onNext={onComplete}
					nextLabel="Continue"
				/>
			)}
		</div>
	);
}

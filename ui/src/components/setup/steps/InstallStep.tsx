import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Progress } from "#/components/ui/progress";
import { Spinner } from "#/components/ui/spinner";
import { useAppRegistry, useInstallSetupApp } from "#/hooks/homelab";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";
import type { AppProgress, SetupState } from "../SetupWizard";
import { StepNavigation } from "../StepNavigation";

interface InstallStepProps {
	state: SetupState;
	updateState: (updates: Partial<SetupState>) => void;
	onComplete: () => void;
	onBack: () => void;
}

function phaseLabel(phase: AppProgress["phase"]): string {
	switch (phase) {
		case "pulling":
			return m.installStep_pullingImage();
		case "starting":
			return m.installStep_startingContainer();
		case "done":
			return m.installStep_installed();
		case "error":
			return m.installStep_failed();
	}
}

export function InstallStep({
	state,
	updateState,
	onComplete,
	onBack,
}: InstallStepProps) {
	const { data: registryData } = useAppRegistry();
	const installMutation = useInstallSetupApp();

	// Refs to hold latest callbacks without triggering effect re-runs
	const updateStateRef = useRef(updateState);
	updateStateRef.current = updateState;
	const onCompleteRef = useRef(onComplete);
	onCompleteRef.current = onComplete;

	// Capture values once on mount — don't re-run if parent re-renders
	const appsRef = useRef(() => {
		const selected = state.selectedApps;
		const resolved = state.resolvedApps;
		const autoAdded = state.autoAddedDeps;
		return [
			...selected,
			...resolved.filter((a) => !selected.includes(a)),
			...autoAdded.filter(
				(a) => !selected.includes(a) && !resolved.includes(a),
			),
		];
	});
	const installRef = useRef(installMutation);
	installRef.current = installMutation;

	// Build display name lookup from registry data
	const displayNames = useRef<Record<string, string>>({});
	if (registryData?.apps) {
		for (const app of registryData.apps) {
			displayNames.current[app.name] = app.displayName;
		}
	}

	// Install apps sequentially using real server calls
	useEffect(() => {
		const apps = appsRef.current();
		if (apps.length === 0) {
			onCompleteRef.current();
			return;
		}

		const getDisplayName = (name: string) => displayNames.current[name] ?? name;

		// Initialize all apps as pulling
		const initial: AppProgress[] = apps.map((name) => ({
			name,
			displayName: getDisplayName(name),
			phase: "pulling" as const,
			pullPercent: 0,
		}));
		updateStateRef.current({ installProgress: initial });

		let cancelled = false;

		async function installAll() {
			for (let i = 0; i < apps.length; i++) {
				if (cancelled) return;

				const name = apps[i];

				// Set current app to "pulling"
				updateStateRef.current({
					installProgress: apps.map((n, j) => ({
						name: n,
						displayName: getDisplayName(n),
						phase: j < i ? "done" : j === i ? "pulling" : ("pulling" as const),
						pullPercent: j < i ? undefined : 0,
					})),
				});

				try {
					const result = await installRef.current.mutateAsync(name);

					if (!result.success) {
						updateStateRef.current({
							installProgress: apps.map((n, j) => ({
								name: n,
								displayName: getDisplayName(n),
								phase:
									j < i ? "done" : j === i ? "error" : ("pulling" as const),
								pullPercent: j > i ? 0 : undefined,
								error: j === i ? result.error : undefined,
							})),
						});
						continue;
					}

					// Mark as done
					updateStateRef.current({
						installProgress: apps.map((n, j) => ({
							name: n,
							displayName: getDisplayName(n),
							phase: j <= i ? "done" : ("pulling" as const),
							pullPercent: j > i ? 0 : undefined,
						})),
					});
				} catch (err) {
					if (cancelled) return;
					updateStateRef.current({
						installProgress: apps.map((n, j) => ({
							name: n,
							displayName: getDisplayName(n),
							phase: j < i ? "done" : j === i ? "error" : ("pulling" as const),
							pullPercent: j > i ? 0 : undefined,
							error:
								j === i
									? err instanceof Error
										? err.message
										: m.installStep_installationFailed()
									: undefined,
						})),
					});
				}
			}
		}

		installAll();

		return () => {
			cancelled = true;
		};
	}, []); // empty deps — runs once, uses refs for latest values

	const doneCount = state.installProgress.filter(
		(p) => p.phase === "done",
	).length;
	const finishedCount = state.installProgress.filter(
		(p) => p.phase === "done" || p.phase === "error",
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
										(app.phase === "pulling" || app.phase === "starting") &&
											"text-muted-foreground",
									)}
								>
									{phaseLabel(app.phase)}
								</span>
							</div>

							{/* Pull progress bar */}
							{app.phase === "pulling" && app.pullPercent !== undefined && (
								<Progress value={app.pullPercent} className="mt-1.5 h-1" />
							)}

							{/* Error message */}
							{app.phase === "error" && app.error && (
								<p className="mt-1 text-xs text-destructive">{app.error}</p>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Navigation — only shown once all installs finish */}
			{total > 0 && finishedCount === total && (
				<StepNavigation
					onBack={onBack}
					onNext={onComplete}
					nextLabel={m.common_continue()}
				/>
			)}
		</div>
	);
}

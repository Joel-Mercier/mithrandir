import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowLeft,
	Check,
	CheckCircle2,
	Circle,
	GitPullRequest,
	SkipForward,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { Spinner } from "#/components/ui/spinner";
import {
	useBuildCli,
	useBuildUi,
	useFinalizeUpdate,
	useInstallDeps,
	usePingHealth,
	usePullLatestChanges,
} from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_update/self-update")({
	component: SelfUpdatePage,
});

type StepStatus = "pending" | "running" | "done" | "skipped" | "error";

interface Step {
	id: string;
	name: string;
	status: StepStatus;
	message?: string;
}

const REDIRECT_DELAY = 4;

function SelfUpdatePage() {
	const [steps, setSteps] = useState<Step[]>([
		{ id: "pull", name: m.selfUpdate_stepGitPull(), status: "pending" },
		{ id: "deps", name: m.selfUpdate_stepDeps(), status: "pending" },
		{
			id: "build-cli",
			name: m.selfUpdate_stepBuildCli(),
			status: "pending",
		},
		{
			id: "build-ui",
			name: m.selfUpdate_stepBuildUi(),
			status: "pending",
		},
		{
			id: "finalize",
			name: m.selfUpdate_stepFinalize(),
			status: "pending",
		},
	]);
	const [phase, setPhase] = useState<"running" | "reconnecting" | "done" | "error">("running");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [countdown, setCountdown] = useState(REDIRECT_DELAY);
	const hasStarted = useRef(false);

	const pullMutation = usePullLatestChanges();
	const depsMutation = useInstallDeps();
	const buildCliMutation = useBuildCli();
	const buildUiMutation = useBuildUi();
	const finalizeMutation = useFinalizeUpdate();
	const pingMutation = usePingHealth();

	// Capture mutation refs to avoid re-triggering the effect
	const pullRef = useRef(pullMutation);
	const depsRef = useRef(depsMutation);
	const buildCliRef = useRef(buildCliMutation);
	const buildUiRef = useRef(buildUiMutation);
	const finalizeRef = useRef(finalizeMutation);
	const pingRef = useRef(pingMutation);

	pullRef.current = pullMutation;
	depsRef.current = depsMutation;
	buildCliRef.current = buildCliMutation;
	buildUiRef.current = buildUiMutation;
	finalizeRef.current = finalizeMutation;
	pingRef.current = pingMutation;

	const updateStep = useCallback(
		(id: string, updates: Partial<Step>) => {
			setSteps((prev) =>
				prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
			);
		},
		[],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: run-once effect using refs
	useEffect(() => {
		if (hasStarted.current) return;
		hasStarted.current = true;
		runUpdate();
	}, []);

	async function runUpdate() {
		try {
			// Step 1: Git pull
			updateStep("pull", { status: "running" });
			const pullResult =
				await pullRef.current.mutateAsync(undefined);
			if (pullResult.skipped) {
				updateStep("pull", {
					status: "skipped",
					message: m.selfUpdate_pullSkipped({
						branch: pullResult.branch,
						commit: pullResult.before,
					}),
				});
			} else {
				updateStep("pull", {
					status: "done",
					message: m.selfUpdate_pullDone({
						branch: pullResult.branch,
						before: pullResult.before,
						after: pullResult.after,
					}),
				});
			}

			// Step 2: Install dependencies
			updateStep("deps", { status: "running" });
			await depsRef.current.mutateAsync(undefined);
			updateStep("deps", {
				status: "done",
				message: m.selfUpdate_depsDone(),
			});

			// Step 3: Build CLI
			updateStep("build-cli", { status: "running" });
			await buildCliRef.current.mutateAsync(undefined);
			updateStep("build-cli", {
				status: "done",
				message: m.selfUpdate_cliBuildDone(),
			});

			// Step 4: Build UI
			updateStep("build-ui", { status: "running" });
			await buildUiRef.current.mutateAsync(undefined);
			updateStep("build-ui", {
				status: "done",
				message: m.selfUpdate_uiBuildDone(),
			});

			// Step 5: Finalize
			updateStep("finalize", { status: "running" });
			const finalizeResult =
				await finalizeRef.current.mutateAsync(undefined);
			updateStep("finalize", {
				status: "done",
				message: m.selfUpdate_symlinkDone(),
			});

			// Step 6 (conditional): Restart UI service
			if (finalizeResult.willRestart) {
				setSteps((prev) => [
					...prev,
					{
						id: "restart",
						name: m.selfUpdate_stepRestart(),
						status: "running",
						message: m.selfUpdate_restarting(),
					},
				]);
				setPhase("reconnecting");

				// Wait for the restart to kick in
				await sleep(3000);

				// Poll until the server is back
				const startTime = Date.now();
				const timeout = 60000;
				let connected = false;
				while (Date.now() - startTime < timeout) {
					try {
						await pingRef.current.mutateAsync(undefined);
						connected = true;
						break;
					} catch {
						await sleep(2000);
					}
				}

				if (connected) {
					setSteps((prev) =>
						prev.map((s) =>
							s.id === "restart"
								? {
										...s,
										status: "done" as const,
										message: m.selfUpdate_restartDone(),
									}
								: s,
						),
					);
				} else {
					setSteps((prev) =>
						prev.map((s) =>
							s.id === "restart"
								? {
										...s,
										status: "error" as const,
										message:
											"Timed out waiting for server",
									}
								: s,
						),
					);
				}
			}

			setPhase("done");
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : String(err);
			setErrorMessage(message);
			setPhase("error");

			// Mark the current running step as error
			setSteps((prev) =>
				prev.map((s) =>
					s.status === "running"
						? { ...s, status: "error", message }
						: s,
				),
			);
		}
	}

	// Countdown redirect after success
	useEffect(() => {
		if (phase !== "done") return;
		if (countdown <= 0) {
			window.location.href = "/settings";
			return;
		}
		const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
		return () => clearTimeout(timer);
	}, [phase, countdown]);

	const doneCount = steps.filter(
		(s) => s.status === "done" || s.status === "skipped",
	).length;
	const currentRunning = steps.find((s) => s.status === "running");

	return (
		<div className="w-full max-w-lg px-6 animate-in fade-in duration-500">
			{/* Header */}
			<div className="mb-8 text-center">
				<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-sm">
					<GitPullRequest className="h-6 w-6 text-foreground" />
				</div>
				<h1 className="font-display text-2xl font-bold tracking-tight">
					{m.selfUpdate_title()}
				</h1>
				<p className="mt-1.5 text-sm text-muted-foreground">
					{m.selfUpdate_subtitle()}
				</p>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm">
							{phase === "done"
								? m.selfUpdate_success()
								: phase === "error"
									? m.selfUpdate_error()
									: m.selfUpdate_title()}
						</CardTitle>
						<Badge
							variant="outline"
							className={
								phase === "done"
									? "border-status-healthy/30 bg-status-healthy/15 text-status-healthy"
									: phase === "error"
										? "border-destructive/30 bg-destructive/15 text-destructive"
										: ""
							}
						>
							{doneCount}/{steps.length}
						</Badge>
					</div>
				</CardHeader>

				<CardContent className="space-y-0">
					{steps.map((step, i) => (
						<div key={step.id}>
							<div className="flex items-start gap-3 py-2.5">
								<StepIcon status={step.status} />
								<div className="min-w-0 flex-1">
									<span
										className={`text-sm font-medium leading-5 ${
											step.status === "pending"
												? "text-muted-foreground/60"
												: "text-foreground"
										}`}
									>
										{step.name}
									</span>
									{step.message && (
										<p
											className={`mt-0.5 font-mono-data text-xs ${
												step.status === "error"
													? "text-destructive"
													: "text-muted-foreground"
											}`}
										>
											{step.message}
										</p>
									)}
								</div>
								{step.status === "skipped" && (
									<Badge variant="secondary" className="shrink-0 text-[10px]">
										skipped
									</Badge>
								)}
							</div>
							{i < steps.length - 1 && <Separator />}
						</div>
					))}
				</CardContent>

				{/* Active step indicator */}
				{(phase === "running" || phase === "reconnecting") && currentRunning && (
					<CardFooter>
						<div className="flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-muted/50 px-3.5 py-2.5">
							<Spinner size="sm" className="text-foreground" />
							<span className="text-xs text-muted-foreground">
								{phase === "reconnecting"
									? m.selfUpdate_reconnecting()
									: getRunningLabel(currentRunning.id)}
							</span>
						</div>
					</CardFooter>
				)}

				{/* Success state */}
				{phase === "done" && (
					<CardFooter className="flex-col gap-3">
						<Alert className="animate-in fade-in slide-in-from-bottom-2 duration-300 border-status-healthy/20 bg-status-healthy/5 [&>svg]:text-status-healthy">
							<CheckCircle2 className="h-4 w-4" />
							<AlertTitle className="text-status-healthy">
								{m.selfUpdate_success()}
							</AlertTitle>
							<AlertDescription className="text-status-healthy/80">
								{m.selfUpdate_redirecting({
									seconds: String(countdown),
								})}
							</AlertDescription>
						</Alert>
					</CardFooter>
				)}

				{/* Error state */}
				{phase === "error" && (
					<CardFooter>
						<Alert variant="destructive" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
							<X className="h-4 w-4" />
							<AlertTitle>{m.selfUpdate_error()}</AlertTitle>
							{errorMessage && (
								<AlertDescription className="font-mono-data text-xs">
									{errorMessage}
								</AlertDescription>
							)}
						</Alert>
					</CardFooter>
				)}
			</Card>

			{/* Bottom actions */}
			<div className="mt-6 flex justify-center">
				{(phase === "done" || phase === "error") && (
					<Button
						variant="ghost"
						size="sm"
						className="gap-2 text-muted-foreground"
						onClick={() => { window.location.href = "/settings"; }}
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						{m.selfUpdate_backToSettings()}
					</Button>
				)}
			</div>
		</div>
	);
}

function StepIcon({ status }: { status: StepStatus }) {
	switch (status) {
		case "done":
			return (
				<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-status-healthy/15 text-status-healthy ring-1 ring-status-healthy/30 animate-in zoom-in duration-200">
					<Check className="h-3 w-3" strokeWidth={3} />
				</div>
			);
		case "skipped":
			return (
				<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border">
					<SkipForward className="h-3 w-3" />
				</div>
			);
		case "error":
			return (
				<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive ring-1 ring-destructive/30 animate-in zoom-in duration-200">
					<X className="h-3 w-3" strokeWidth={3} />
				</div>
			);
		case "running":
			return (
				<div className="flex h-5 w-5 shrink-0 items-center justify-center">
					<Spinner size="sm" className="h-5 w-5 text-foreground" />
				</div>
			);
		default:
			return (
				<div className="flex h-5 w-5 shrink-0 items-center justify-center">
					<Circle className="h-2.5 w-2.5 text-border" />
				</div>
			);
	}
}

function getRunningLabel(stepId: string): string {
	switch (stepId) {
		case "pull":
			return m.selfUpdate_pulling();
		case "deps":
			return m.selfUpdate_installingDeps();
		case "build-cli":
			return m.selfUpdate_buildingCli();
		case "build-ui":
			return m.selfUpdate_buildingUi();
		case "finalize":
			return m.selfUpdate_finalizing();
		case "restart":
			return m.selfUpdate_restarting();
		default:
			return "";
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

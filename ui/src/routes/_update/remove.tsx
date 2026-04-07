import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowLeft,
	Check,
	CheckCircle2,
	Circle,
	SkipForward,
	Trash2,
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
	useRemoveAppData,
	useRemoveBackups,
	useRemoveCleanup,
	useRemoveConfig,
	useRemoveDocker,
	useRemoveInfo,
	useRemoveRclone,
	useRemoveStopApps,
	useRemoveSystemdServices,
} from "#/hooks/homelab";
import type { RemoveInfo } from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_update/remove")({
	component: RemovePage,
});

type StepStatus = "pending" | "running" | "waiting" | "done" | "skipped" | "error";

interface Step {
	id: string;
	name: string;
	status: StepStatus;
	message?: string;
	needsPrompt: boolean;
	promptText?: string;
	promptHint?: string;
}

function RemovePage() {
	const navigate = useNavigate();
	const removeInfoQuery = useRemoveInfo();
	const info = removeInfoQuery.data;

	const [steps, setSteps] = useState<Step[]>([
		{ id: "stop-apps", name: m.remove_stepStopApps(), status: "pending", needsPrompt: false },
		{ id: "systemd", name: m.remove_stepSystemd(), status: "pending", needsPrompt: false },
		{ id: "backups", name: m.remove_stepBackups(), status: "pending", needsPrompt: true },
		{ id: "rclone", name: m.remove_stepRclone(), status: "pending", needsPrompt: true },
		{ id: "app-data", name: m.remove_stepAppData(), status: "pending", needsPrompt: true },
		{ id: "docker", name: m.remove_stepDocker(), status: "pending", needsPrompt: true },
		{ id: "cleanup", name: m.remove_stepCleanup(), status: "pending", needsPrompt: false },
		{ id: "config", name: m.remove_stepConfig(), status: "pending", needsPrompt: true },
	]);
	const [phase, setPhase] = useState<"loading" | "running" | "done" | "error">("loading");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [waitingStepId, setWaitingStepId] = useState<string | null>(null);
	const hasStarted = useRef(false);

	const stopAppsMutation = useRemoveStopApps();
	const systemdMutation = useRemoveSystemdServices();
	const backupsMutation = useRemoveBackups();
	const rcloneMutation = useRemoveRclone();
	const appDataMutation = useRemoveAppData();
	const dockerMutation = useRemoveDocker();
	const cleanupMutation = useRemoveCleanup();
	const configMutation = useRemoveConfig();

	// Refs to avoid re-triggering effect
	const stopAppsRef = useRef(stopAppsMutation);
	const systemdRef = useRef(systemdMutation);
	const backupsRef = useRef(backupsMutation);
	const rcloneRef = useRef(rcloneMutation);
	const appDataRef = useRef(appDataMutation);
	const dockerRef = useRef(dockerMutation);
	const cleanupRef = useRef(cleanupMutation);
	const configRef = useRef(configMutation);

	stopAppsRef.current = stopAppsMutation;
	systemdRef.current = systemdMutation;
	backupsRef.current = backupsMutation;
	rcloneRef.current = rcloneMutation;
	appDataRef.current = appDataMutation;
	dockerRef.current = dockerMutation;
	cleanupRef.current = cleanupMutation;
	configRef.current = configMutation;

	// Store resolve function for waiting steps
	const waitResolveRef = useRef<((action: "remove" | "skip") => void) | null>(null);

	const updateStep = useCallback(
		(id: string, updates: Partial<Step>) => {
			setSteps((prev) =>
				prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
			);
		},
		[],
	);

	function waitForUser(stepId: string): Promise<"remove" | "skip"> {
		return new Promise((resolve) => {
			setWaitingStepId(stepId);
			waitResolveRef.current = resolve;
		});
	}

	function handleUserAction(action: "remove" | "skip") {
		setWaitingStepId(null);
		if (waitResolveRef.current) {
			const resolve = waitResolveRef.current;
			waitResolveRef.current = null;
			resolve(action);
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: run-once effect using refs
	useEffect(() => {
		if (hasStarted.current || !info) return;
		hasStarted.current = true;
		setPhase("running");
		runRemoval(info);
	}, [info]);

	async function runRemoval(removeInfo: RemoveInfo) {
		try {
			// Step 1: Stop all apps (auto)
			updateStep("stop-apps", { status: "running" });
			const stopResult = await stopAppsRef.current.mutateAsync(undefined);
			updateStep("stop-apps", {
				status: "done",
				message: stopResult.stopped.length > 0
					? m.remove_stoppedApps({ count: String(stopResult.stopped.length) })
					: m.remove_noApps(),
			});

			// Step 2: Remove systemd services (auto)
			updateStep("systemd", { status: "running" });
			await systemdRef.current.mutateAsync(undefined);
			updateStep("systemd", {
				status: "done",
				message: m.remove_systemdDone(),
			});

			// Step 3: Delete local backups (prompt)
			if (removeInfo.hasBackups) {
				updateStep("backups", {
					status: "waiting",
					promptText: m.remove_promptBackups({ backupDir: removeInfo.backupDir }),
				});
				const backupsAction = await waitForUser("backups");
				if (backupsAction === "remove") {
					updateStep("backups", { status: "running" });
					const result = await backupsRef.current.mutateAsync(undefined);
					updateStep("backups", {
						status: "done",
						message: result.deleted
							? m.remove_backupsDone({ dir: result.backupDir })
							: m.remove_backupsNotFound({ dir: result.backupDir }),
					});
				} else {
					updateStep("backups", { status: "skipped", message: m.remove_kept() });
				}
			} else {
				updateStep("backups", {
					status: "skipped",
					message: m.remove_backupsNotFound({ dir: removeInfo.backupDir }),
				});
			}

			// Step 4: Uninstall rclone (prompt)
			if (removeInfo.hasRclone) {
				updateStep("rclone", {
					status: "waiting",
					promptText: m.remove_promptRclone(),
				});
				const rcloneAction = await waitForUser("rclone");
				if (rcloneAction === "remove") {
					updateStep("rclone", { status: "running" });
					const result = await rcloneRef.current.mutateAsync(undefined);
					updateStep("rclone", {
						status: "done",
						message: result.removed ? m.remove_rcloneDone() : m.remove_rcloneNotFound(),
					});
				} else {
					updateStep("rclone", { status: "skipped", message: m.remove_kept() });
				}
			} else {
				updateStep("rclone", { status: "skipped", message: m.remove_rcloneNotFound() });
			}

			// Step 5: Remove app data (prompt)
			if (removeInfo.appDataDirs.length > 0) {
				updateStep("app-data", {
					status: "waiting",
					promptText: m.remove_promptAppData(),
					promptHint: m.remove_promptAppDataHint(),
				});
				const appDataAction = await waitForUser("app-data");
				if (appDataAction === "remove") {
					updateStep("app-data", { status: "running" });
					const result = await appDataRef.current.mutateAsync(undefined);
					updateStep("app-data", {
						status: "done",
						message: m.remove_appDataDone({
							count: String(result.count),
							dir: result.baseDir,
						}),
					});
				} else {
					updateStep("app-data", { status: "skipped", message: m.remove_kept() });
				}
			} else {
				updateStep("app-data", { status: "skipped", message: m.remove_appDataEmpty() });
			}

			// Step 6: Remove Docker (prompt)
			if (removeInfo.hasDocker) {
				updateStep("docker", {
					status: "waiting",
					promptText: m.remove_promptDocker(),
					promptHint: m.remove_promptDockerHint(),
				});
				const dockerAction = await waitForUser("docker");
				if (dockerAction === "remove") {
					updateStep("docker", { status: "running" });
					await dockerRef.current.mutateAsync(undefined);
					updateStep("docker", { status: "done", message: m.remove_dockerDone() });
				} else {
					updateStep("docker", { status: "skipped", message: m.remove_kept() });
				}
			} else {
				updateStep("docker", { status: "skipped", message: m.remove_rcloneNotFound() });
			}

			// Step 7: Clean up logs, CLI, cache (auto)
			updateStep("cleanup", { status: "running" });
			await cleanupRef.current.mutateAsync(undefined);
			updateStep("cleanup", { status: "done", message: m.remove_cleanupDone() });

			// Step 8: Remove .env config (prompt)
			updateStep("config", {
				status: "waiting",
				promptText: m.remove_promptConfig(),
				promptHint: m.remove_promptConfigHint(),
			});
			const configAction = await waitForUser("config");
			if (configAction === "remove") {
				updateStep("config", { status: "running" });
				const result = await configRef.current.mutateAsync(undefined);
				updateStep("config", {
					status: "done",
					message: result.removed ? m.remove_configDone() : m.remove_configNotFound(),
				});
			} else {
				updateStep("config", { status: "skipped", message: m.remove_kept() });
			}

			setPhase("done");
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			setErrorMessage(message);
			setPhase("error");

			// Mark the current running step as error
			setSteps((prev) =>
				prev.map((s) =>
					s.status === "running" || s.status === "waiting"
						? { ...s, status: "error", message }
						: s,
				),
			);
		}
	}

	const doneCount = steps.filter(
		(s) => s.status === "done" || s.status === "skipped" || s.status === "error",
	).length;
	const currentRunning = steps.find((s) => s.status === "running");

	return (
		<div className="w-full max-w-lg px-6 animate-in fade-in duration-500">
			{/* Header */}
			<div className="mb-8 text-center">
				<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 shadow-sm">
					<Trash2 className="h-6 w-6 text-destructive" />
				</div>
				<h1 className="font-display text-2xl font-bold tracking-tight">
					{m.remove_title()}
				</h1>
				<p className="mt-1.5 text-sm text-muted-foreground">
					{m.remove_subtitle()}
				</p>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm">
							{phase === "done"
								? m.remove_success()
								: phase === "error"
									? m.remove_error()
									: m.remove_title()}
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
									{step.message && step.status !== "waiting" && (
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

									{/* Inline prompt for waiting steps */}
									{step.status === "waiting" && waitingStepId === step.id && (
										<div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
											<p className="text-sm text-foreground">
												{step.promptText}
											</p>
											{step.promptHint && (
												<p className="text-xs text-muted-foreground">
													{step.promptHint}
												</p>
											)}
											{/* Show app data directory list */}
											{step.id === "app-data" && info?.appDataDirs && (
												<div className="rounded-md border border-border/50 bg-muted/50 p-2">
													{info.appDataDirs.map((dir) => (
														<p key={dir} className="font-mono-data text-xs text-muted-foreground">
															{info.baseDir}/{dir}
														</p>
													))}
												</div>
											)}
											<div className="flex gap-2 pt-1">
												<Button
													size="sm"
													variant="destructive"
													className="gap-1.5"
													onClick={() => handleUserAction("remove")}
												>
													<Trash2 className="h-3 w-3" />
													{m.remove_actionRemove()}
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleUserAction("skip")}
												>
													{m.remove_actionSkip()}
												</Button>
											</div>
										</div>
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
				{phase === "running" && currentRunning && (
					<CardFooter>
						<div className="flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-muted/50 px-3.5 py-2.5">
							<Spinner size="sm" className="text-foreground" />
							<span className="text-xs text-muted-foreground">
								{getRunningLabel(currentRunning.id)}
							</span>
						</div>
					</CardFooter>
				)}

				{/* Loading state */}
				{phase === "loading" && (
					<CardFooter>
						<div className="flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-muted/50 px-3.5 py-2.5">
							<Spinner size="sm" className="text-foreground" />
							<span className="text-xs text-muted-foreground">
								Preparing...
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
								{m.remove_success()}
							</AlertTitle>
							<AlertDescription className="text-status-healthy/80">
								{m.remove_successMessage()}
							</AlertDescription>
						</Alert>
					</CardFooter>
				)}

				{/* Error state */}
				{phase === "error" && (
					<CardFooter>
						<Alert variant="destructive" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
							<X className="h-4 w-4" />
							<AlertTitle>{m.remove_error()}</AlertTitle>
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
						onClick={() => navigate({ to: "/settings" })}
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						{m.remove_backToSettings()}
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
		case "waiting":
			return (
				<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30 animate-in zoom-in duration-200">
					<AlertTriangle className="h-3 w-3" />
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
		case "stop-apps":
			return m.remove_stoppingApps();
		case "systemd":
			return m.remove_removingSystemd();
		case "backups":
			return m.remove_deletingBackups();
		case "rclone":
			return m.remove_removingRclone();
		case "app-data":
			return m.remove_removingAppData();
		case "docker":
			return m.remove_removingDocker();
		case "cleanup":
			return m.remove_cleaningUp();
		case "config":
			return m.remove_removingConfig();
		default:
			return "";
	}
}

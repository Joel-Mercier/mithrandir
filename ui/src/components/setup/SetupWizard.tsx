import { useState, useCallback } from "react";
import {
	SetupStepper,
	type StepDefinition,
	type StepStatus,
} from "./SetupStepper";
import { WelcomeStep } from "./steps/WelcomeStep";
import { BaseDirStep } from "./steps/BaseDirStep";
import { AppSelectStep } from "./steps/AppSelectStep";
import { SecretsStep } from "./steps/SecretsStep";
import { InstallStep } from "./steps/InstallStep";
import { HttpsStep } from "./steps/HttpsStep";
import { AutoSetupStep } from "./steps/AutoSetupStep";
import { FirewallBackupStep } from "./steps/FirewallBackupStep";
import { SummaryStep } from "./steps/SummaryStep";

// ─── Types ────────────────────────────────────────────────────────

type CheckStatus = "checking" | "installed" | "missing";

export interface AppProgress {
	name: string;
	displayName: string;
	phase: "pulling" | "starting" | "done" | "error";
	pullPercent?: number;
	error?: string;
}

export interface AppSetupResult {
	name: string;
	displayName: string;
	status: "pending" | "configuring" | "done" | "skipped" | "warning";
	warning?: string;
}

export interface ServiceUrl {
	name: string;
	displayName: string;
	url: string;
	status: "running" | "stopped";
}

export interface SetupState {
	currentStep: number;
	stepStatuses: Record<number, StepStatus>;

	systemChecks: {
		docker: CheckStatus;
		swap: CheckStatus;
		rclone: CheckStatus;
	};
	baseDir: string;
	selectedCategories: string[];
	selectedApps: string[];
	resolvedApps: string[];
	autoAddedDeps: string[];
	secrets: Record<string, string>;
	installProgress: AppProgress[];
	httpsEnabled: boolean;
	acmeEmail: string;
	autoSetupCredentials: { username: string; password: string };
	autoSetupResults: AppSetupResult[];
	firewallEnabled: boolean;
	backupHour: number;
	serviceUrls: ServiceUrl[];
}

// ─── Steps config ─────────────────────────────────────────────────

const STEPS: StepDefinition[] = [
	{ label: "Welcome", description: "System requirements" },
	{ label: "Base Directory", description: "Data storage location" },
	{ label: "Applications", description: "Choose your apps" },
	{ label: "Secrets", description: "API keys & passwords" },
	{ label: "Installation", description: "Pull & start containers" },
	{ label: "HTTPS", description: "Caddy reverse proxy" },
	{ label: "Auto-Setup", description: "Configure apps" },
	{ label: "Firewall & Backup", description: "Security & scheduling" },
	{ label: "Summary", description: "All done" },
];

// ─── Initial state ────────────────────────────────────────────────

function createInitialState(): SetupState {
	return {
		currentStep: 1,
		stepStatuses: { 1: "active" },
		systemChecks: { docker: "checking", swap: "checking", rclone: "checking" },
		baseDir: "/opt/homelab",
		selectedCategories: [],
		selectedApps: [],
		resolvedApps: [],
		autoAddedDeps: [],
		secrets: {},
		installProgress: [],
		httpsEnabled: false,
		acmeEmail: "",
		autoSetupCredentials: { username: "", password: "" },
		autoSetupResults: [],
		firewallEnabled: false,
		backupHour: 2,
		serviceUrls: [],
	};
}

// ─── Component ────────────────────────────────────────────────────

export function SetupWizard() {
	const [state, setState] = useState<SetupState>(createInitialState);

	const updateState = useCallback(
		(updates: Partial<SetupState>) =>
			setState((prev) => ({ ...prev, ...updates })),
		[],
	);

	const goToStep = useCallback(
		(step: number) => {
			setState((prev) => ({
				...prev,
				currentStep: step,
				stepStatuses: {
					...prev.stepStatuses,
					[step]: "active",
				},
			}));
		},
		[],
	);

	const completeStep = useCallback(
		(step: number) => {
			setState((prev) => {
				const next = step + 1;
				return {
					...prev,
					currentStep: next,
					stepStatuses: {
						...prev.stepStatuses,
						[step]: "completed",
						...(next <= STEPS.length ? { [next]: "active" } : {}),
					},
				};
			});
		},
		[],
	);

	const skipStep = useCallback(
		(step: number) => {
			setState((prev) => {
				const next = step + 1;
				return {
					...prev,
					currentStep: next,
					stepStatuses: {
						...prev.stepStatuses,
						[step]: "skipped",
						...(next <= STEPS.length ? { [next]: "active" } : {}),
					},
				};
			});
		},
		[],
	);

	const stepContent = (() => {
		switch (state.currentStep) {
			case 1:
				return (
					<WelcomeStep
						state={state}
						updateState={updateState}
						onComplete={() => completeStep(1)}
					/>
				);
			case 2:
				return (
					<BaseDirStep
						state={state}
						updateState={updateState}
						onComplete={() => completeStep(2)}
						onBack={() => goToStep(1)}
					/>
				);
			case 3:
				return (
					<AppSelectStep
						state={state}
						updateState={updateState}
						onComplete={() => completeStep(3)}
						onBack={() => goToStep(2)}
					/>
				);
			case 4:
				return (
					<SecretsStep
						state={state}
						updateState={updateState}
						onComplete={() => completeStep(4)}
						onBack={() => goToStep(3)}
					/>
				);
			case 5:
				return (
					<InstallStep
						state={state}
						updateState={updateState}
						onComplete={() => completeStep(5)}
						onBack={() => goToStep(4)}
					/>
				);
			case 6:
				return (
					<HttpsStep
						state={state}
						updateState={updateState}
						onComplete={() => completeStep(6)}
						onSkip={() => skipStep(6)}
						onBack={() => goToStep(5)}
					/>
				);
			case 7:
				return (
					<AutoSetupStep
						state={state}
						updateState={updateState}
						onComplete={() => completeStep(7)}
						onBack={() => goToStep(6)}
					/>
				);
			case 8:
				return (
					<FirewallBackupStep
						state={state}
						updateState={updateState}
						onComplete={() => completeStep(8)}
						onBack={() => goToStep(7)}
					/>
				);
			case 9:
				return <SummaryStep state={state} />;
			default:
				return null;
		}
	})();

	return (
		<div className="mx-auto max-w-[1400px] px-4 py-8">
			<div className="flex flex-col lg:flex-row items-start gap-8">
				<SetupStepper
					steps={STEPS}
					currentStep={state.currentStep}
					stepStatuses={state.stepStatuses}
					onStepClick={goToStep}
				/>

				<div className="w-full min-w-0 flex-1">
					<div
						key={state.currentStep}
						className="animate-in fade-in-0 duration-300"
					>
						{stepContent}
					</div>
				</div>
			</div>
		</div>
	);
}

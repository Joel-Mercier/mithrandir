import { Check, X } from "lucide-react";
import { Progress } from "#/components/ui/progress";
import { cn } from "#/lib/utils";

export type StepStatus =
	| "pending"
	| "active"
	| "completed"
	| "error"
	| "skipped";

export interface StepDefinition {
	label: string;
	description: string;
}

interface SetupStepperProps {
	steps: StepDefinition[];
	currentStep: number;
	stepStatuses: Record<number, StepStatus>;
	onStepClick: (step: number) => void;
}

export function SetupStepper({
	steps,
	currentStep,
	stepStatuses,
	onStepClick,
}: SetupStepperProps) {
	const completedCount = Object.values(stepStatuses).filter(
		(s) => s === "completed" || s === "skipped",
	).length;
	const progressPercent = Math.round((completedCount / steps.length) * 100);

	return (
		<>
			{/* Desktop sidebar */}
			<aside className="hidden w-[280px] shrink-0 lg:block">
				<div className="sticky top-[calc(3.5rem+2rem)]">
					<div className="relative overflow-hidden rounded-2xl border border-border/30 bg-muted/30 p-6">
						{/* Dot-grid texture */}
						<div
							className="pointer-events-none absolute inset-0 opacity-[0.03]"
							style={{
								backgroundImage:
									"radial-gradient(circle, currentColor 1px, transparent 1px)",
								backgroundSize: "16px 16px",
							}}
						/>

						<div className="relative space-y-0">
							{steps.map((step, i) => {
								const stepNum = i + 1;
								const status = stepStatuses[stepNum] ?? "pending";
								const isClickable = status === "completed";

								return (
									<div key={stepNum}>
										{isClickable ? (
											<button
												type="button"
												className="flex w-full cursor-pointer items-start gap-3 text-left"
												onClick={() => onStepClick(stepNum)}
											>
												<StepCircle stepNum={stepNum} status={status} />
												<StepLabel step={step} status={status} />
											</button>
										) : (
											<div className="flex items-start gap-3">
												<StepCircle stepNum={stepNum} status={status} />
												<StepLabel step={step} status={status} />
											</div>
										)}

										{/* Connector line */}
										{i < steps.length - 1 && (
											<div className="ml-[13px] py-2">
												<div
													className={cn(
														"h-4 w-0.5 rounded-full",
														status === "completed" || status === "skipped"
															? "bg-primary"
															: "bg-border",
													)}
												/>
											</div>
										)}
									</div>
								);
							})}
						</div>

						{/* Progress footer */}
						<div className="relative mt-6 border-t border-border/30 pt-4">
							<p className="mb-2 text-xs text-muted-foreground">
								Step {currentStep} of {steps.length}
							</p>
							<Progress value={progressPercent} className="h-1" />
						</div>
					</div>
				</div>
			</aside>

			{/* Mobile horizontal stepper */}
			<div className="mb-6 lg:hidden">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-1.5">
						{steps.map((_, i) => {
							const stepNum = i + 1;
							const status = stepStatuses[stepNum] ?? "pending";
							return (
								<div
									key={stepNum}
									className={cn(
										"h-2 w-2 rounded-full transition-colors",
										status === "active" && "bg-primary ring-4 ring-primary/20",
										status === "completed" && "bg-primary",
										status === "skipped" && "bg-primary/50",
										status === "error" && "bg-destructive",
										status === "pending" && "bg-border",
									)}
								/>
							);
						})}
					</div>
					<p className="text-xs text-muted-foreground">
						{steps[currentStep - 1]?.label}
					</p>
				</div>
				<Progress value={progressPercent} className="mt-2 h-1" />
			</div>
		</>
	);
}

function StepLabel({
	step,
	status,
}: {
	step: StepDefinition;
	status: StepStatus;
}) {
	return (
		<div className="min-w-0 pt-0.5">
			<p
				className={cn(
					"text-sm font-medium leading-tight",
					status === "active" && "text-foreground",
					status === "completed" && "text-foreground",
					status === "pending" && "text-muted-foreground/60",
					status === "error" && "text-destructive",
					status === "skipped" && "text-muted-foreground",
				)}
			>
				{step.label}
			</p>
			<p
				className={cn(
					"mt-0.5 text-xs leading-snug",
					status === "active"
						? "text-muted-foreground"
						: "text-muted-foreground/50",
				)}
			>
				{step.description}
			</p>
		</div>
	);
}

function StepCircle({
	stepNum,
	status,
}: {
	stepNum: number;
	status: StepStatus;
}) {
	const base =
		"flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all";

	if (status === "completed" || status === "skipped") {
		return (
			<div className={cn(base, "bg-primary text-primary-foreground")}>
				<Check className="h-3.5 w-3.5" />
			</div>
		);
	}

	if (status === "active") {
		return (
			<div
				className={cn(
					base,
					"bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse",
				)}
			>
				{stepNum}
			</div>
		);
	}

	if (status === "error") {
		return (
			<div
				className={cn(base, "bg-destructive text-destructive-foreground")}
			>
				<X className="h-3.5 w-3.5" />
			</div>
		);
	}

	// pending
	return (
		<div
			className={cn(
				base,
				"border-2 border-muted-foreground/30 text-muted-foreground/40",
			)}
		>
			{stepNum}
		</div>
	);
}

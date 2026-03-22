import { z } from "zod";
import { useAppForm } from "#/hooks/form";
import { useSetupBaseDir } from "#/hooks/homelab";
import { StepNavigation } from "../StepNavigation";
import type { SetupState } from "../SetupWizard";

interface BaseDirStepProps {
	state: SetupState;
	updateState: (updates: Partial<SetupState>) => void;
	onComplete: () => void;
	onBack: () => void;
}

const baseDirSchema = z.object({
	baseDir: z
		.string()
		.min(1, "Required")
		.startsWith("/", "Must be an absolute path"),
});

function TreePreview({ baseDir }: { baseDir: string }) {
	const dirs = [
		`${baseDir}/`,
		`  configs/`,
		`    jellyfin/`,
		`    sonarr/`,
		`    radarr/`,
		`    ...`,
		`  compose/`,
		`  backups/`,
	];

	return (
		<div className="rounded-lg bg-muted/50 p-4">
			<p className="mb-2 text-xs font-medium text-muted-foreground">
				Directory structure preview
			</p>
			<pre className="font-mono-data text-xs leading-relaxed text-muted-foreground">
				{dirs.join("\n")}
			</pre>
		</div>
	);
}

export function BaseDirStep({
	state,
	updateState,
	onComplete,
	onBack,
}: BaseDirStepProps) {
	const setupBaseDir = useSetupBaseDir();

	const form = useAppForm({
		defaultValues: {
			baseDir: state.baseDir,
		},
		validators: {
			onBlur: baseDirSchema,
		},
		onSubmit: async ({ value }) => {
			await setupBaseDir.mutateAsync(value.baseDir);
			updateState({ baseDir: value.baseDir });
			onComplete();
		},
	});

	return (
		<div>
			<h2 className="font-display text-2xl font-bold tracking-tight">
				Base Directory
			</h2>
			<p className="mt-2 text-muted-foreground">
				Choose where app configs, compose files, and backups will be stored.
			</p>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="mt-8 space-y-6"
			>
				<form.AppField name="baseDir">
					{(field) => (
						<field.TextField
							label="Base directory path"
							placeholder="/opt/homelab"
						/>
					)}
				</form.AppField>

				<p className="text-xs text-muted-foreground">
					This directory will be created if it doesn't exist. All app data
					lives here.
				</p>

				<form.Subscribe selector={(s) => s.values.baseDir}>
					{(baseDir) => <TreePreview baseDir={baseDir} />}
				</form.Subscribe>

				<StepNavigation
					onBack={onBack}
					onNext={() => form.handleSubmit()}
					nextDisabled={setupBaseDir.isPending}
					isLoading={setupBaseDir.isPending}
				/>
			</form>
		</div>
	);
}

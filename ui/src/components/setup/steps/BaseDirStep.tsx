import { z } from "zod";
import { useAppForm } from "#/hooks/form";
import { useSetupBaseDir } from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";
import type { SetupState } from "../SetupWizard";
import { StepNavigation } from "../StepNavigation";

interface BaseDirStepProps {
	state: SetupState;
	updateState: (updates: Partial<SetupState>) => void;
	onComplete: () => void;
	onBack: () => void;
}

function getBaseDirSchema() {
	return z.object({
		baseDir: z
			.string()
			.min(1, m.baseDir_required())
			.startsWith("/", m.baseDir_absolutePath()),
	});
}

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
				{m.baseDir_previewTitle()}
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
			onBlur: getBaseDirSchema(),
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
				{m.baseDir_title()}
			</h2>
			<p className="mt-2 text-muted-foreground">{m.baseDir_subtitle()}</p>

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
							label={m.baseDir_label()}
							placeholder="/opt/homelab"
						/>
					)}
				</form.AppField>

				<p className="text-xs text-muted-foreground">{m.baseDir_hint()}</p>

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

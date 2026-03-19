import { FolderOpen } from "lucide-react";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { StepNavigation } from "../StepNavigation";
import type { SetupState } from "../SetupWizard";

interface BaseDirStepProps {
	state: SetupState;
	updateState: (updates: Partial<SetupState>) => void;
	onComplete: () => void;
	onBack: () => void;
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
	return (
		<div>
			<h2 className="font-display text-2xl font-bold tracking-tight">
				Base Directory
			</h2>
			<p className="mt-2 text-muted-foreground">
				Choose where app configs, compose files, and backups will be stored.
			</p>

			<div className="mt-8 space-y-6">
				<div className="space-y-2">
					<Label htmlFor="base-dir" className="flex items-center gap-2">
						<FolderOpen className="h-4 w-4" />
						Base directory path
					</Label>
					<Input
						id="base-dir"
						value={state.baseDir}
						onChange={(e) => updateState({ baseDir: e.target.value })}
						placeholder="/opt/homelab"
					/>
					<p className="text-xs text-muted-foreground">
						This directory will be created if it doesn't exist. All app data
						lives here.
					</p>
				</div>

				<TreePreview baseDir={state.baseDir} />
			</div>

			<StepNavigation
				onBack={onBack}
				onNext={onComplete}
				nextDisabled={!state.baseDir.trim()}
			/>
		</div>
	);
}

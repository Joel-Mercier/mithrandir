import { Loader2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import {
	useAppRegistry,
	useGenerateSecret,
	useSaveSecrets,
} from "#/hooks/homelab";
import { m } from "#/paraglide/messages.js";
import type { SetupState } from "../SetupWizard";
import { StepNavigation } from "../StepNavigation";

interface SecretsStepProps {
	state: SetupState;
	updateState: (updates: Partial<SetupState>) => void;
	onComplete: () => void;
	onBack: () => void;
}

interface SecretField {
	app: string;
	appDisplayName: string;
	key: string;
	label: string;
	description: string;
	required: boolean;
	sensitive: boolean;
	generate?: string;
}

export function SecretsStep({
	state,
	updateState,
	onComplete,
	onBack,
}: SecretsStepProps) {
	const { data: registry, isLoading: registryLoading } = useAppRegistry();
	const saveSecrets = useSaveSecrets();
	const generateSecret = useGenerateSecret();
	const [generatingKey, setGeneratingKey] = useState<string | null>(null);

	const allSelectedApps = useMemo(() => {
		const combined = new Set([...state.selectedApps, ...state.resolvedApps]);
		return combined;
	}, [state.selectedApps, state.resolvedApps]);

	const secretFields = useMemo(() => {
		if (!registry) return [];
		const fields: SecretField[] = [];
		for (const app of registry.apps) {
			if (!allSelectedApps.has(app.name)) continue;
			for (const secret of app.secrets) {
				fields.push({
					app: app.name,
					appDisplayName: app.displayName,
					key: secret.envVar,
					label: secret.prompt,
					description: secret.prompt,
					required: secret.required,
					sensitive: secret.sensitive,
					generate: secret.generate,
				});
			}
		}
		return fields;
	}, [registry, allSelectedApps]);

	const updateSecret = (key: string, value: string) => {
		updateState({ secrets: { ...state.secrets, [key]: value } });
	};

	const handleGenerate = (field: SecretField) => {
		if (!field.generate) return;
		setGeneratingKey(field.key);
		generateSecret.mutate(field.generate, {
			onSuccess: (value) => {
				updateSecret(field.key, value);
				setGeneratingKey(null);
			},
			onError: () => {
				setGeneratingKey(null);
			},
		});
	};

	const handleNext = () => {
		const nonEmptySecrets: Record<string, string> = {};
		for (const [key, value] of Object.entries(state.secrets)) {
			if (value.trim()) {
				nonEmptySecrets[key] = value;
			}
		}

		if (Object.keys(nonEmptySecrets).length === 0) {
			onComplete();
			return;
		}

		saveSecrets.mutate(nonEmptySecrets, {
			onSuccess: () => onComplete(),
		});
	};

	if (registryLoading) {
		return (
			<div>
				<h2 className="font-display text-2xl font-bold tracking-tight">
					{m.secrets_title()}
				</h2>
				<div className="mt-8 flex items-center gap-3 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin" />
					<span>{m.secrets_loadingDefs()}</span>
				</div>
			</div>
		);
	}

	if (secretFields.length === 0) {
		return (
			<div>
				<h2 className="font-display text-2xl font-bold tracking-tight">
					{m.secrets_title()}
				</h2>
				<p className="mt-2 text-muted-foreground">{m.secrets_noneRequired()}</p>
				<StepNavigation onBack={onBack} onNext={onComplete} />
			</div>
		);
	}

	// Group by app
	const grouped = secretFields.reduce<Record<string, SecretField[]>>(
		(acc, field) => {
			if (!acc[field.app]) acc[field.app] = [];
			acc[field.app].push(field);
			return acc;
		},
		{},
	);

	const requiredMissing = secretFields.some(
		(f) => f.required && !state.secrets[f.key]?.trim(),
	);

	return (
		<div>
			<h2 className="font-display text-2xl font-bold tracking-tight">
				{m.secrets_title()}
			</h2>
			<p className="mt-2 text-muted-foreground">{m.secrets_subtitle()}</p>

			<div className="mt-8 space-y-8">
				{Object.entries(grouped).map(([appName, fields], groupIdx) => (
					<div key={appName}>
						{groupIdx > 0 && <Separator className="mb-8" />}
						<h3 className="mb-4 text-sm font-semibold">
							{fields[0].appDisplayName}
						</h3>
						<div className="space-y-4">
							{fields.map((field) => (
								<div key={field.key} className="space-y-1.5">
									<Label
										htmlFor={field.key}
										className="flex items-center gap-2"
									>
										{field.label}
										{field.required && (
											<span className="text-destructive">*</span>
										)}
									</Label>
									<div className="flex items-center gap-2">
										<Input
											id={field.key}
											type={field.sensitive ? "password" : "text"}
											value={state.secrets[field.key] ?? ""}
											onChange={(e) => updateSecret(field.key, e.target.value)}
											placeholder={field.description}
										/>
										{field.generate && (
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={generatingKey === field.key}
												onClick={() => handleGenerate(field)}
											>
												{generatingKey === field.key ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<Wand2 className="h-4 w-4" />
												)}
												<span className="ml-1">{m.common_generate()}</span>
											</Button>
										)}
									</div>
									<p className="text-xs text-muted-foreground">
										{field.description}
									</p>
								</div>
							))}
						</div>
					</div>
				))}
			</div>

			<StepNavigation
				onBack={onBack}
				onNext={handleNext}
				nextDisabled={requiredMissing || saveSecrets.isPending}
			/>
		</div>
	);
}

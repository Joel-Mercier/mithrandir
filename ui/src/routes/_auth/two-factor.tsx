import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Button } from "#/components/ui/button";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
	InputOTPSeparator,
} from "#/components/ui/input-otp";
import { ShieldCheck } from "lucide-react";
import { Spinner } from "#/components/ui/spinner";
import { useVerifyTwoFactor } from "#/hooks/auth";
import { useAppForm } from "#/hooks/form";

export const Route = createFileRoute("/_auth/two-factor")({
	component: TwoFactorPage,
});

const totpSchema = z.object({
	code: z.string().length(6, "Enter the 6-digit code"),
});

const backupSchema = z.object({
	code: z.string().min(1, "Enter a backup code"),
});

function TwoFactorPage() {
	const [useBackup, setUseBackup] = useState(false);
	const verify = useVerifyTwoFactor();

	const form = useAppForm({
		defaultValues: {
			code: "",
		},
		validators: {
			onSubmit: useBackup ? backupSchema : totpSchema,
		},
		onSubmit: ({ value }) => {
			verify.mutate({ code: value.code, isBackup: useBackup });
		},
	});

	function handleToggleMode() {
		setUseBackup(!useBackup);
		form.reset();
		verify.reset();
	}

	return (
		<div className="w-full px-4 py-12">
			<Card className="mx-auto w-full max-w-sm shadow-lg">
				<CardHeader className="text-center">
					<div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
						<ShieldCheck className="h-6 w-6 text-primary" />
					</div>
					<CardTitle className="text-lg">
						{useBackup ? "Backup Code" : "Two-Factor Authentication"}
					</CardTitle>
					<CardDescription>
						{useBackup
							? "Enter one of your backup codes"
							: "Enter the 6-digit code from your authenticator app"}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="flex flex-col items-center gap-4"
					>
						{useBackup ? (
							<form.AppField name="code">
								{(field) => (
									<field.TextField
										label="Backup code"
										placeholder="Enter backup code"
									/>
								)}
							</form.AppField>
						) : (
							<form.AppField name="code">
								{(field) => (
									<InputOTP
										maxLength={6}
										value={field.state.value}
										onChange={(value) => field.handleChange(value)}
										onComplete={() => form.handleSubmit()}
										autoFocus
									>
										<InputOTPGroup>
											<InputOTPSlot index={0} />
											<InputOTPSlot index={1} />
											<InputOTPSlot index={2} />
										</InputOTPGroup>
										<InputOTPSeparator />
										<InputOTPGroup>
											<InputOTPSlot index={3} />
											<InputOTPSlot index={4} />
											<InputOTPSlot index={5} />
										</InputOTPGroup>
									</InputOTP>
								)}
							</form.AppField>
						)}

						{verify.error && (
							<p className="text-sm text-status-critical">
								{verify.error.message ?? "Verification failed."}
							</p>
						)}

						<Button
							type="submit"
							className="w-full gap-2"
							disabled={verify.isPending}
						>
							{verify.isPending ? (
								<Spinner size="sm" className="text-primary-foreground" />
							) : (
								<ShieldCheck className="h-4 w-4" />
							)}
							{verify.isPending ? "Verifying..." : "Verify"}
						</Button>

						<button
							type="button"
							className="text-sm text-muted-foreground underline-offset-4 hover:underline"
							onClick={handleToggleMode}
						>
							{useBackup
								? "Use authenticator app instead"
								: "Use a backup code instead"}
						</button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}

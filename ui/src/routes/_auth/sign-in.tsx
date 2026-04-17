import { createFileRoute, Link } from "@tanstack/react-router";
import { Fingerprint, KeyRound, LogIn } from "lucide-react";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { Spinner } from "#/components/ui/spinner";
import { useSignIn, useSignInPasskey, useSignInSSO } from "#/hooks/auth";
import { useAppForm } from "#/hooks/form";
import { getOidcEnabled } from "#/lib/auth";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_auth/sign-in")({
	loader: () => getOidcEnabled(),
	component: SignInPage,
});

const signInSchema = z.object({
	email: z.email(m.signIn_emailValidation()),
	password: z.string().min(1, m.signIn_passwordValidation()),
});

function SignInPage() {
	const oidcEnabled = Route.useLoaderData();
	const signIn = useSignIn();
	const signInSSO = useSignInSSO();
	const signInPasskey = useSignInPasskey();

	const form = useAppForm({
		defaultValues: {
			email: "",
			password: "",
		},
		validators: {
			onBlur: signInSchema,
		},
		onSubmit: ({ value }) => {
			signIn.mutate(value);
		},
	});

	return (
		<div className="w-full px-4 py-12">
			<Card className="mx-auto w-full max-w-sm shadow-lg">
				<CardHeader className="text-center">
					<div className="mx-auto mb-2 font-display text-2xl font-bold tracking-tight">
						{m.common_mithrandir()}
					</div>
					<CardTitle className="text-lg">{m.signIn_title()}</CardTitle>
					<CardDescription>{m.signIn_description()}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{oidcEnabled && (
							<Button
								type="button"
								variant="outline"
								className="w-full gap-2"
								disabled={signInSSO.isPending}
								onClick={() => signInSSO.mutate()}
							>
								{signInSSO.isPending ? (
									<Spinner size="sm" />
								) : (
									<KeyRound className="h-4 w-4" />
								)}
								{signInSSO.isPending
									? m.signIn_ssoSigning()
									: m.signIn_sso()}
							</Button>
						)}
						<Button
							type="button"
							variant="outline"
							className="w-full gap-2"
							disabled={signInPasskey.isPending}
							onClick={() => signInPasskey.mutate()}
						>
							{signInPasskey.isPending ? (
								<Spinner size="sm" />
							) : (
								<Fingerprint className="h-4 w-4" />
							)}
							{signInPasskey.isPending
								? m.signIn_passkeySigning()
								: m.signIn_passkey()}
						</Button>
					</div>

					{signInSSO.error && (
						<p className="mt-2 text-sm text-status-critical">
							{signInSSO.error.message ?? m.signIn_ssoFailed()}
						</p>
					)}
					{signInPasskey.error && (
						<p className="mt-2 text-sm text-status-critical">
							{signInPasskey.error.message ?? m.signIn_passkeyFailed()}
						</p>
					)}

					<div className="relative my-4">
						<Separator />
						<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
							{m.signIn_orDivider()}
						</span>
					</div>

					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4"
					>
						<form.AppField name="email">
							{(field) => (
								<field.TextField
									label={m.signIn_emailLabel()}
									placeholder="admin@example.com"
									type="email"
									autoComplete="email"
								/>
							)}
						</form.AppField>

						<form.AppField name="password">
							{(field) => (
								<field.TextField
									label={m.signIn_passwordLabel()}
									placeholder="••••••••"
									type="password"
									autoComplete="current-password"
								/>
							)}
						</form.AppField>

						{signIn.error && (
							<p className="text-sm text-status-critical">
								{signIn.error.message ?? m.signIn_failed()}
							</p>
						)}

						<Button
							type="submit"
							className="w-full gap-2"
							disabled={signIn.isPending}
						>
							{signIn.isPending ? (
								<Spinner size="sm" className="text-primary-foreground" />
							) : (
								<LogIn className="h-4 w-4" />
							)}
							{signIn.isPending ? m.signIn_submitting() : m.signIn_submit()}
						</Button>
					</form>

					<div className="mt-4 text-center text-sm text-muted-foreground">
						{m.signIn_noAccount()}{" "}
						<Link
							to="/sign-up"
							className="font-medium text-foreground underline-offset-4 hover:underline"
						>
							{m.signIn_signUpLink()}
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

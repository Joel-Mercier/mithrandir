import { createFileRoute, Link } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import { useSignUp } from "#/hooks/auth";
import { useAppForm } from "#/hooks/form";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_auth/sign-up")({
	component: SignUpPage,
});

const signUpSchema = z
	.object({
		name: z.string().min(1, m.signUp_nameValidation()),
		email: z.email(m.signUp_emailValidation()),
		password: z.string().min(8, m.signUp_passwordValidation()),
		confirmPassword: z.string().min(1, m.signUp_confirmValidation()),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: m.signUp_passwordMismatch(),
		path: ["confirmPassword"],
	});

function SignUpPage() {
	const signUp = useSignUp();

	const form = useAppForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
		validators: {
			onBlur: signUpSchema,
		},
		onSubmit: ({ value }) => {
			signUp.mutate({
				name: value.name,
				email: value.email,
				password: value.password,
			});
		},
	});

	return (
		<div className="w-full px-4 py-12">
			<Card className="mx-auto w-full max-w-sm shadow-lg">
				<CardHeader className="text-center">
					<div className="mx-auto mb-2 font-display text-2xl font-bold tracking-tight">
						{m.common_mithrandir()}
					</div>
					<CardTitle className="text-lg">{m.signUp_title()}</CardTitle>
					<CardDescription>{m.signUp_description()}</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4"
					>
						<form.AppField name="name">
							{(field) => (
								<field.TextField
									label={m.signUp_nameLabel()}
									placeholder="Admin"
									autoComplete="name"
								/>
							)}
						</form.AppField>

						<form.AppField name="email">
							{(field) => (
								<field.TextField
									label={m.signUp_emailLabel()}
									placeholder="admin@example.com"
									type="email"
									autoComplete="email"
								/>
							)}
						</form.AppField>

						<form.AppField name="password">
							{(field) => (
								<field.TextField
									label={m.signUp_passwordLabel()}
									placeholder="••••••••"
									type="password"
									autoComplete="new-password"
								/>
							)}
						</form.AppField>

						<form.AppField name="confirmPassword">
							{(field) => (
								<field.TextField
									label={m.signUp_confirmPasswordLabel()}
									placeholder="••••••••"
									type="password"
									autoComplete="new-password"
								/>
							)}
						</form.AppField>

						{signUp.error && (
							<p className="text-sm text-status-critical">
								{signUp.error.message ?? m.signUp_failed()}
							</p>
						)}

						<Button
							type="submit"
							className="w-full gap-2"
							disabled={signUp.isPending}
						>
							{signUp.isPending ? (
								<Spinner size="sm" className="text-primary-foreground" />
							) : (
								<UserPlus className="h-4 w-4" />
							)}
							{signUp.isPending ? m.signUp_submitting() : m.signUp_submit()}
						</Button>
					</form>

					<div className="mt-4 text-center text-sm text-muted-foreground">
						{m.signUp_hasAccount()}{" "}
						<Link
							to="/sign-in"
							className="font-medium text-foreground underline-offset-4 hover:underline"
						>
							{m.signUp_signInLink()}
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

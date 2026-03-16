import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Button } from "#/components/ui/button";
import { LogIn } from "lucide-react";
import { Spinner } from "#/components/ui/spinner";
import { useSignIn } from "#/hooks/auth";
import { useAppForm } from "#/hooks/form";

export const Route = createFileRoute("/_auth/sign-in")({
	component: SignInPage,
});

const signInSchema = z.object({
	email: z.email("Please enter a valid email address"),
	password: z.string().min(1, "Password is required"),
});

function SignInPage() {
	const signIn = useSignIn();

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
						Mithrandir
					</div>
					<CardTitle className="text-lg">Sign in</CardTitle>
					<CardDescription>
						Enter your credentials to access the dashboard
					</CardDescription>
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
						<form.AppField name="email">
							{(field) => (
								<field.TextField
									label="Email"
									placeholder="admin@example.com"
									type="email"
									autoComplete="email"
								/>
							)}
						</form.AppField>

						<form.AppField name="password">
							{(field) => (
								<field.TextField
									label="Password"
									placeholder="••••••••"
									type="password"
									autoComplete="current-password"
								/>
							)}
						</form.AppField>

						{signIn.error && (
							<p className="text-sm text-status-critical">
								{signIn.error.message ?? "Sign in failed."}
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
							{signIn.isPending ? "Signing in..." : "Sign in"}
						</Button>
					</form>

					<div className="mt-4 text-center text-sm text-muted-foreground">
						Don&apos;t have an account?{" "}
						<Link
							to="/sign-up"
							className="font-medium text-foreground underline-offset-4 hover:underline"
						>
							Sign up
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

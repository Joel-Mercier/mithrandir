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
import { UserPlus } from "lucide-react";
import { Spinner } from "#/components/ui/spinner";
import { useSignUp } from "#/hooks/auth";
import { useAppForm } from "#/hooks/form";

export const Route = createFileRoute("/_auth/sign-up")({
	component: SignUpPage,
});

const signUpSchema = z
	.object({
		name: z.string().min(1, "Name is required"),
		email: z.email("Please enter a valid email address"),
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
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
						Mithrandir
					</div>
					<CardTitle className="text-lg">Create account</CardTitle>
					<CardDescription>
						Set up your admin account for the dashboard
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
						<form.AppField name="name">
							{(field) => (
								<field.TextField
									label="Name"
									placeholder="Admin"
									autoComplete="name"
								/>
							)}
						</form.AppField>

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
									autoComplete="new-password"
								/>
							)}
						</form.AppField>

						<form.AppField name="confirmPassword">
							{(field) => (
								<field.TextField
									label="Confirm password"
									placeholder="••••••••"
									type="password"
									autoComplete="new-password"
								/>
							)}
						</form.AppField>

						{signUp.error && (
							<p className="text-sm text-status-critical">
								{signUp.error.message ?? "Sign up failed."}
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
							{signUp.isPending ? "Creating account..." : "Create account"}
						</Button>
					</form>

					<div className="mt-4 text-center text-sm text-muted-foreground">
						Already have an account?{" "}
						<Link
							to="/sign-in"
							className="font-medium text-foreground underline-offset-4 hover:underline"
						>
							Sign in
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { UserPlus } from "lucide-react";
import { Spinner } from "#/components/ui/spinner";
import { useSignUp } from "#/hooks/auth";

export const Route = createFileRoute("/_auth/sign-up")({
	component: SignUpPage,
});

function SignUpPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [validationError, setValidationError] = useState("");
	const signUp = useSignUp();

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setValidationError("");

		if (password !== confirmPassword) {
			setValidationError("Passwords do not match.");
			return;
		}

		if (password.length < 8) {
			setValidationError("Password must be at least 8 characters.");
			return;
		}

		signUp.mutate({ name, email, password });
	}

	const error = validationError || (signUp.error?.message ?? "");

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
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								type="text"
								placeholder="Admin"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								autoComplete="name"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="admin@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								autoComplete="email"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoComplete="new-password"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm password</Label>
							<Input
								id="confirmPassword"
								type="password"
								placeholder="••••••••"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								autoComplete="new-password"
							/>
						</div>

						{error && (
							<p className="text-sm text-status-critical">{error}</p>
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

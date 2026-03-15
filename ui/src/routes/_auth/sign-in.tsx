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
import { LogIn } from "lucide-react";
import { Spinner } from "#/components/ui/spinner";

export const Route = createFileRoute("/_auth/sign-in")({
	component: SignInPage,
});

function SignInPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setLoading(true);
		// Mock — no actual auth call
		setTimeout(() => {
			setLoading(false);
			setError("Authentication is not connected yet.");
		}, 800);
	}

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
					<form onSubmit={handleSubmit} className="space-y-4">
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
								autoComplete="current-password"
							/>
						</div>

						{error && (
							<p className="text-sm text-status-critical">{error}</p>
						)}

						<Button type="submit" className="w-full gap-2" disabled={loading}>
							{loading ? (
								<Spinner size="sm" className="text-primary-foreground" />
							) : (
								<LogIn className="h-4 w-4" />
							)}
							{loading ? "Signing in..." : "Sign in"}
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
	)
}

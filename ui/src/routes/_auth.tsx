import { Outlet, createFileRoute } from "@tanstack/react-router";
import ThemeToggle from "#/components/ThemeToggle";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
});

function AuthLayout() {
	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30">
			<div className="absolute right-4 top-4">
				<ThemeToggle />
			</div>
			<Outlet />
		</div>
	);
}

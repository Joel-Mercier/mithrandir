import { createFileRoute, Outlet } from "@tanstack/react-router";
import LanguageSwitch from "#/components/LanguageSwitch";
import ThemeToggle from "#/components/ThemeToggle";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
});

function AuthLayout() {
	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-background to-muted/30">
			<div className="absolute right-4 top-4 gap-1">
				<LanguageSwitch />
				<ThemeToggle />
			</div>
			<Outlet />
		</div>
	);
}

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/auth";

export const Route = createFileRoute("/_update")({
	beforeLoad: async ({ location }) => {
		const session = await getSession();
		if (!session) {
			throw redirect({
				to: "/sign-in",
				search: { redirect: location.href },
			});
		}
		return { user: session.user };
	},
	component: UpdateLayout,
});

function UpdateLayout() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-background to-muted/30">
			<Outlet />
		</main>
	);
}

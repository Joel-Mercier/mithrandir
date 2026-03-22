import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import Header from "#/components/Header";
import Footer from "#/components/Footer";
import { getSession } from "#/lib/auth";
import { fetchSetupStatus } from "#/lib/server/setup";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: location.href },
      });
    }
    const { status: setupStatus } = await fetchSetupStatus();
    const isSetupRoute = location.href.includes("/setup");
    if (setupStatus === "pending" && !isSetupRoute) {
      throw redirect({ to: "/setup" });
    }
    if (setupStatus === "completed" && isSetupRoute) {
      throw redirect({ to: "/" });
    }
    return { user: session.user, setupStatus };
  },
	component: AppLayout,
});

function AppLayout() {
	return (
		<>
			<Header />
			<main className="flex-1">
				<Outlet />
			</main>
			<Footer />
		</>
	);
}

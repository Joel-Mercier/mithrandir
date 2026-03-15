import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import Header from "#/components/Header";
import Footer from "#/components/Footer";
import { getSession } from "#/lib/auth";

export const Route = createFileRoute("/_app")({
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

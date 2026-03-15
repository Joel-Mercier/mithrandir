import { Outlet, createFileRoute } from "@tanstack/react-router";
import Header from "#/components/Header";
import Footer from "#/components/Footer";

export const Route = createFileRoute("/_app")({
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

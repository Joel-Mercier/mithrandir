import { createFileRoute } from "@tanstack/react-router";
import { SetupWizard } from "#/components/setup/SetupWizard";

export const Route = createFileRoute("/_app/setup")({
	component: SetupPage,
});

function SetupPage() {
	return <SetupWizard />;
}

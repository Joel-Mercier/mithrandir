import { Link } from "@tanstack/react-router";
import { LogOut, Menu, User } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "#/components/ui/sheet";
import { useSignOut } from "#/hooks/auth";
import { m } from "#/paraglide/messages.js";
import LanguageSwitch from "./LanguageSwitch";
import ThemeToggle from "./ThemeToggle";

function getNavLinks() {
	return [
		{ to: "/", label: m.common_dashboard() },
		{ to: "/apps", label: m.common_apps() },
		{ to: "/media-library", label: m.common_mediaLibrary() },
		{ to: "/backup-restore", label: m.common_backupRestore() },
		{ to: "/settings", label: m.common_settings() },
		{ to: "/upload", label: m.upload_title() },
	];
}

export default function MobileNav() {
	const [open, setOpen] = useState(false);
	const signOut = useSignOut();
	const navLinks = getNavLinks();

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" className="lg:hidden">
					<Menu className="h-5 w-5" />
					<span className="sr-only">{m.common_openMenu()}</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="right" className="w-64">
				<SheetHeader>
					<SheetTitle className="font-display text-lg">
						{m.common_mithrandir()}
					</SheetTitle>
				</SheetHeader>
				<nav className="mt-6 flex flex-col gap-1">
					{navLinks.map((link) => (
						<Link
							key={link.label}
							to={link.to}
							onClick={() => setOpen(false)}
							className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
							activeOptions={{ exact: link.to === "/" }}
							activeProps={{
								className: "rounded-md px-3 py-2 text-sm font-medium bg-accent",
							}}
						>
							{link.label}
						</Link>
					))}
				</nav>
				<Separator className="my-4" />
				<Link
					to="/profile"
					onClick={() => setOpen(false)}
					className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
				>
					<User className="h-4 w-4" />
					{m.common_profile()}
				</Link>
				<Button
					variant="ghost"
					className="w-full justify-start gap-2 text-status-critical hover:text-status-critical"
					onClick={() => {
						setOpen(false);
						signOut.mutate();
					}}
				>
					<LogOut data-icon="inline-start" />
					{m.common_signOut()}
				</Button>
				<div className="mt-auto flex items-center gap-1 pt-6">
					<LanguageSwitch />
					<ThemeToggle />
				</div>
			</SheetContent>
		</Sheet>
	);
}

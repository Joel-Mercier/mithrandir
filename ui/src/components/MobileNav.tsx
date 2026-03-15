import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, LogOut, User } from "lucide-react";
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
import LanguageSwitch from "./LanguageSwitch";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
	{ to: "/", label: "Dashboard" },
	{ to: "/apps", label: "Apps" },
	{ to: "/backup-restore", label: "Backup & Restore" },
	{ to: "/settings", label: "Settings" },
] as const;

export default function MobileNav() {
	const [open, setOpen] = useState(false);
	const signOut = useSignOut();

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" className="md:hidden">
					<Menu className="h-5 w-5" />
					<span className="sr-only">Open menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="right" className="w-64">
				<SheetHeader>
					<SheetTitle className="font-display text-lg">Mithrandir</SheetTitle>
				</SheetHeader>
				<nav className="mt-6 flex flex-col gap-1">
					{navLinks.map((link) => (
						<Link
							key={link.label}
							to={link.to}
							onClick={() => setOpen(false)}
							className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
							activeOptions={{ exact: link.to === "/" }}
							activeProps={{ className: "rounded-md px-3 py-2 text-sm font-medium bg-accent" }}
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
					Profile
				</Link>
				<button
					type="button"
					onClick={() => {
						setOpen(false);
						signOut.mutate();
					}}
					className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-status-critical transition-colors hover:bg-accent"
				>
					<LogOut className="h-4 w-4" />
					Sign out
				</button>
				<div className="mt-auto flex items-center gap-1 pt-6">
					<LanguageSwitch />
					<ThemeToggle />
				</div>
			</SheetContent>
		</Sheet>
	);
}

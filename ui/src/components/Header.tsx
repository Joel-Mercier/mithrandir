import { Link } from "@tanstack/react-router";
import { LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Skeleton } from "#/components/ui/skeleton";
import { useVersion } from "#/hooks/homelab";
import { useSignOut } from "#/hooks/auth";
import { authClient } from "#/lib/auth-client";
import LanguageSwitch from "./LanguageSwitch";
import MobileNav from "./MobileNav";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
	{ to: "/", label: "Dashboard" },
	{ to: "/apps", label: "Apps" },
	{ to: "/backup-restore", label: "Backup & Restore" },
	{ to: "/settings", label: "Settings" },
] as const;

export default function Header() {
	const { data: session } = authClient.useSession();
	const signOut = useSignOut();
	const versionQuery = useVersion();
	const user = session?.user;
	const initials = user?.name
		? user.name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: (user?.email.slice(0, 2).toUpperCase() ?? "");

	return (
		<header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
			<div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
				{/* Brand */}
				<Link to="/" className="flex items-center gap-2">
					<span className="font-display text-lg font-bold tracking-tight">
						Mithrandir
					</span>
					{versionQuery.isPending ? (
						<Skeleton className="hidden h-4 w-12 sm:inline-flex" />
					) : versionQuery.data ? (
						<Badge
							variant="outline"
							className="hidden font-mono-data text-[10px] sm:inline-flex"
						>
							v{versionQuery.data.version}
						</Badge>
					) : null}
				</Link>

				{/* Desktop nav */}
				<nav className="hidden items-center gap-1 md:flex">
					{navLinks.map((link) => (
						<Link
							key={link.label}
							to={link.to}
							className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
							activeOptions={{ exact: link.to === "/" }}
							activeProps={{
								className: "text-foreground",
							}}
							inactiveProps={{
								className: "text-muted-foreground hover:text-foreground",
							}}
						>
							{link.label}
						</Link>
					))}
				</nav>

				{/* Right side */}
				<div className="ml-auto flex items-center gap-1">
					<div className="hidden md:block">
						<LanguageSwitch />
					</div>
					<div className="hidden md:block">
						<ThemeToggle />
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="hidden rounded-full md:inline-flex"
							>
								<Avatar size="sm">
									<AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
								</Avatar>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-44">
							<div className="px-2 py-1.5">
								<p className="text-sm font-medium">{user?.name}</p>
								<p className="text-xs text-muted-foreground">
									{user?.email}
								</p>
							</div>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link to="/profile" className="gap-2">
									<User className="h-3.5 w-3.5" />
									Profile
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link to="/settings" className="gap-2">
									<Settings className="h-3.5 w-3.5" />
									Settings
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="gap-2 text-status-critical focus:text-status-critical"
								onClick={() => signOut.mutate()}
							>
								<LogOut className="h-3.5 w-3.5" />
								Sign out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<MobileNav />
				</div>
			</div>
		</header>
	);
}

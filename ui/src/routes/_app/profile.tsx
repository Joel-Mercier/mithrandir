import { createFileRoute } from "@tanstack/react-router";
import { Clock, KeyRound, Shield, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Breadcrumbs from "#/components/Breadcrumbs";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";

export const Route = createFileRoute("/_app/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	const [name, setName] = useState("Admin");
	const [email, setEmail] = useState("admin@example.com");

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />
			<div className="mb-6">
				<h1 className="font-display text-2xl font-bold tracking-tight">
					Profile
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Manage your account settings
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Profile summary */}
				<Card>
					<CardContent className="flex flex-col items-center gap-4 pt-6">
						<Avatar size="lg">
							<AvatarFallback className="text-lg">AD</AvatarFallback>
						</Avatar>
						<div className="text-center">
							<p className="font-medium">{name}</p>
							<p className="text-sm text-muted-foreground">{email}</p>
						</div>
						<Badge variant="secondary" className="gap-1">
							<Shield className="h-3 w-3" />
							Administrator
						</Badge>
						<Separator />
						<div className="w-full space-y-2 text-sm">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Member since</span>
								<span className="font-mono-data text-xs">Jan 2025</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Last sign in</span>
								<span className="font-mono-data text-xs">2 hours ago</span>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Account details + security */}
				<div className="space-y-6 lg:col-span-2">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm font-medium">
								<User className="h-4 w-4 text-muted-foreground" />
								Account Details
							</CardTitle>
							<CardDescription>
								Update your name and email address
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="profile-name">Name</Label>
									<Input
										id="profile-name"
										value={name}
										onChange={(e) => setName(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="profile-email">Email</Label>
									<Input
										id="profile-email"
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
									/>
								</div>
							</div>
							<div className="flex justify-end">
								<Button
									size="sm"
									className="gap-1.5"
									onClick={() => toast.success("Profile updated.")}
								>
									Save Changes
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm font-medium">
								<KeyRound className="h-4 w-4 text-muted-foreground" />
								Security
							</CardTitle>
							<CardDescription>Change your password</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="current-password">Current password</Label>
									<Input
										id="current-password"
										type="password"
										placeholder="••••••••"
										autoComplete="current-password"
									/>
								</div>
								<div />
								<div className="space-y-2">
									<Label htmlFor="new-password">New password</Label>
									<Input
										id="new-password"
										type="password"
										placeholder="••••••••"
										autoComplete="new-password"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="confirm-password">Confirm new password</Label>
									<Input
										id="confirm-password"
										type="password"
										placeholder="••••••••"
										autoComplete="new-password"
									/>
								</div>
							</div>
							<div className="flex justify-end">
								<Button
									size="sm"
									variant="outline"
									className="gap-1.5"
									onClick={() => toast.success("Password updated.")}
								>
									Update Password
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm font-medium">
								<Clock className="h-4 w-4 text-muted-foreground" />
								Sessions
							</CardTitle>
							<CardDescription>Active sessions on your account</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
									<div className="space-y-0.5">
										<p className="text-sm font-medium">Current session</p>
										<p className="text-xs text-muted-foreground">
											macOS · Chrome · 192.168.1.100
										</p>
									</div>
									<Badge
										variant="outline"
										className="text-xs text-status-healthy"
									>
										Active
									</Badge>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
									<div className="space-y-0.5">
										<p className="text-sm font-medium">Mobile</p>
										<p className="text-xs text-muted-foreground">
											iOS · Safari · 192.168.1.105
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="text-xs text-muted-foreground"
										onClick={() => toast.success("Session revoked.")}
									>
										Revoke
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

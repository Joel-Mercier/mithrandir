import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Shield, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import Breadcrumbs from "#/components/Breadcrumbs";
import { PasskeyCard } from "#/components/profile/PasskeyCard";
import { SessionsCard } from "#/components/profile/SessionsCard";
import { TwoFactorCard } from "#/components/profile/TwoFactorCard";
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
import { Separator } from "#/components/ui/separator";
import { Spinner } from "#/components/ui/spinner";
import {
	useChangeEmail,
	useChangePassword,
	useUpdateProfile,
} from "#/hooks/auth";
import { useAppForm } from "#/hooks/form";
import { authClient } from "#/lib/auth-client";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_app/profile")({
	component: ProfilePage,
});

const profileSchema = z.object({
	name: z.string().min(1, m.profile_nameValidation()),
	email: z.email(m.profile_emailValidation()),
});

const passwordSchema = z
	.object({
		currentPassword: z.string().min(1, m.profile_currentPasswordValidation()),
		newPassword: z.string().min(8, m.profile_newPasswordValidation()),
		confirmPassword: z.string().min(1, m.profile_confirmPasswordValidation()),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: m.profile_passwordMismatch(),
		path: ["confirmPassword"],
	});

function ProfilePage() {
	const { data: session } = authClient.useSession();
	const user = session!.user;
	const updateProfile = useUpdateProfile();
	const changeEmail = useChangeEmail();
	const changePassword = useChangePassword();

	const profileForm = useAppForm({
		defaultValues: {
			name: user.name,
			email: user.email,
		},
		validators: {
			onBlur: profileSchema,
		},
		onSubmit: async ({ value }) => {
			const promises: Promise<unknown>[] = [];

			if (value.name !== user.name) {
				promises.push(
					new Promise((resolve, reject) =>
						updateProfile.mutate(
							{ name: value.name },
							{ onSuccess: resolve, onError: reject },
						),
					),
				);
			}

			if (value.email !== user.email) {
				promises.push(
					new Promise((resolve, reject) =>
						changeEmail.mutate(
							{ newEmail: value.email },
							{ onSuccess: resolve, onError: reject },
						),
					),
				);
			}

			if (promises.length === 0) return;

			await Promise.all(promises);
			toast.success(m.profile_profileUpdated());
		},
	});

	const passwordForm = useAppForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
		validators: {
			onBlur: passwordSchema,
		},
		onSubmit: ({ value }) => {
			changePassword.mutate(
				{
					currentPassword: value.currentPassword,
					newPassword: value.newPassword,
				},
				{
					onSuccess: () => {
						toast.success(m.profile_passwordUpdated());
						passwordForm.reset();
					},
				},
			);
		},
	});

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<Breadcrumbs />
			<div className="mb-6">
				<h1 className="font-display text-2xl font-bold tracking-tight">
					{m.profile_title()}
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					{m.profile_subtitle()}
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Profile summary */}
				<Card>
					<CardContent className="flex flex-col items-center gap-4 pt-6">
						<Avatar size="lg">
							<AvatarFallback className="text-lg">
								{user.name
									?.split(" ")
									.map((n: string) => n[0])
									.join("")
									.toUpperCase()
									.slice(0, 2) ?? "U"}
							</AvatarFallback>
						</Avatar>
						<div className="text-center">
							<p className="font-medium">{user.name}</p>
							<p className="text-sm text-muted-foreground">{user.email}</p>
						</div>
						<Badge variant="secondary" className="gap-1">
							<Shield className="h-3 w-3" />
							{m.profile_administrator()}
						</Badge>
						<Separator />
						<div className="w-full space-y-2 text-sm">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">
									{m.profile_memberSince()}
								</span>
								<span className="font-mono-data text-xs">
									{new Date(user.createdAt).toLocaleDateString("en-US", {
										month: "short",
										year: "numeric",
									})}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">{m.profile_2fa()}</span>
								{user.twoFactorEnabled ? (
									<Badge
										variant="outline"
										className="gap-1 text-xs text-status-healthy"
									>
										<ShieldCheck className="h-3 w-3" />
										{m.common_enabled()}
									</Badge>
								) : (
									<Badge
										variant="outline"
										className="gap-1 text-xs text-muted-foreground"
									>
										{m.profile_off()}
									</Badge>
								)}
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
								{m.profile_accountDetails()}
							</CardTitle>
							<CardDescription>
								{m.profile_accountDetailsDescription()}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									profileForm.handleSubmit();
								}}
								className="space-y-4"
							>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<profileForm.AppField name="name">
										{(field) => (
											<field.TextField
												label={m.common_name()}
												autoComplete="name"
											/>
										)}
									</profileForm.AppField>
									<profileForm.AppField name="email">
										{(field) => (
											<field.TextField
												label={m.common_email()}
												type="email"
												autoComplete="email"
											/>
										)}
									</profileForm.AppField>
								</div>

								{(updateProfile.error || changeEmail.error) && (
									<p className="text-sm text-status-critical">
										{updateProfile.error?.message ??
											changeEmail.error?.message ??
											m.profile_updateFailed()}
									</p>
								)}

								<div className="flex justify-end">
									<Button
										type="submit"
										size="sm"
										className="gap-1.5"
										disabled={updateProfile.isPending || changeEmail.isPending}
									>
										{(updateProfile.isPending || changeEmail.isPending) && (
											<Spinner size="sm" className="text-primary-foreground" />
										)}
										{m.common_save()}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm font-medium">
								<KeyRound className="h-4 w-4 text-muted-foreground" />
								{m.profile_security()}
							</CardTitle>
							<CardDescription>{m.profile_changePassword()}</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									passwordForm.handleSubmit();
								}}
								className="space-y-4"
							>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<passwordForm.AppField name="currentPassword">
										{(field) => (
											<field.TextField
												label={m.profile_currentPassword()}
												placeholder="••••••••"
												type="password"
												autoComplete="current-password"
											/>
										)}
									</passwordForm.AppField>
									<div />
									<passwordForm.AppField name="newPassword">
										{(field) => (
											<field.TextField
												label={m.profile_newPassword()}
												placeholder="••••••••"
												type="password"
												autoComplete="new-password"
											/>
										)}
									</passwordForm.AppField>
									<passwordForm.AppField name="confirmPassword">
										{(field) => (
											<field.TextField
												label={m.profile_confirmNewPassword()}
												placeholder="••••••••"
												type="password"
												autoComplete="new-password"
											/>
										)}
									</passwordForm.AppField>
								</div>

								{changePassword.error && (
									<p className="text-sm text-status-critical">
										{changePassword.error.message ?? m.profile_passwordFailed()}
									</p>
								)}

								<div className="flex justify-end">
									<Button
										type="submit"
										size="sm"
										variant="outline"
										className="gap-1.5"
										disabled={changePassword.isPending}
									>
										{changePassword.isPending && (
											<Spinner size="sm" className="text-primary-foreground" />
										)}
										{m.profile_updatePassword()}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>

					<TwoFactorCard />

					<PasskeyCard />

					<SessionsCard />
				</div>
			</div>
		</div>
	);
}

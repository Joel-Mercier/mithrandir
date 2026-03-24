import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";

const sessionQueryKey = ["auth", "session"];
const sessionsListQueryKey = ["auth", "sessions"];

export function useSignIn() {
	const queryClient = useQueryClient();
	const router = useRouter();

	return useMutation({
		mutationFn: async (params: { email: string; password: string }) => {
			const { data, error } = await authClient.signIn.email({
				email: params.email,
				password: params.password,
			});
			if (error) throw error;
			return data;
		},
		onSuccess: async (data: Record<string, unknown>) => {
			if (data?.twoFactorRedirect) return;
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
			await router.navigate({ to: "/" });
		},
	});
}

export function useSignUp() {
	const queryClient = useQueryClient();
	const router = useRouter();

	return useMutation({
		mutationFn: async (params: {
			name: string;
			email: string;
			password: string;
		}) => {
			const { data, error } = await authClient.signUp.email({
				name: params.name,
				email: params.email,
				password: params.password,
			});
			if (error) throw error;
			return data;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
			await router.navigate({ to: "/" });
		},
	});
}

export function useVerifyTwoFactor() {
	const queryClient = useQueryClient();
	const router = useRouter();

	return useMutation({
		mutationFn: async (params: { code: string; isBackup: boolean }) => {
			const { error } = params.isBackup
				? await authClient.twoFactor.verifyBackupCode({ code: params.code })
				: await authClient.twoFactor.verifyTotp({ code: params.code });
			if (error) throw error;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
			await router.navigate({ to: "/" });
		},
	});
}

export function useUpdateProfile() {
	return useMutation({
		mutationFn: async (params: { name: string }) => {
			const { data, error } = await authClient.updateUser({
				name: params.name,
			});
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			authClient.$store.notify("$sessionSignal");
		},
	});
}

export function useChangeEmail() {
	return useMutation({
		mutationFn: async (params: { newEmail: string }) => {
			const { data, error } = await authClient.changeEmail({
				newEmail: params.newEmail,
			});
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			authClient.$store.notify("$sessionSignal");
		},
	});
}

export function useChangePassword() {
	return useMutation({
		mutationFn: async (params: {
			currentPassword: string;
			newPassword: string;
		}) => {
			const { error } = await authClient.changePassword({
				currentPassword: params.currentPassword,
				newPassword: params.newPassword,
			});
			if (error) throw error;
		},
	});
}

export function useListSessions() {
	return useQuery({
		queryKey: sessionsListQueryKey,
		queryFn: async () => {
			const { data, error } = await authClient.listSessions();
			if (error) throw error;
			return data;
		},
	});
}

export function useRevokeSession() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: { token: string }) => {
			const { error } = await authClient.revokeSession({
				token: params.token,
			});
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: sessionsListQueryKey });
		},
	});
}

export function useSignOut() {
	const queryClient = useQueryClient();
	const router = useRouter();

	return useMutation({
		mutationFn: async () => {
			const { error } = await authClient.signOut();
			if (error) throw error;
		},
		onSuccess: async () => {
			queryClient.setQueryData(sessionQueryKey, null);
			await router.navigate({ to: "/sign-in" });
		},
	});
}

import { Clock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import { useListSessions, useRevokeSession } from "#/hooks/auth";
import { authClient } from "#/lib/auth-client";

function parseUserAgent(ua: string | null | undefined): string {
	if (!ua) return "Unknown device";
	const parts: string[] = [];

	if (/Windows/.test(ua)) parts.push("Windows");
	else if (/Mac OS X|macOS/.test(ua)) parts.push("macOS");
	else if (/Android/.test(ua)) parts.push("Android");
	else if (/iPhone|iPad/.test(ua)) parts.push("iOS");
	else if (/Linux/.test(ua)) parts.push("Linux");

	if (/Firefox\//.test(ua)) parts.push("Firefox");
	else if (/Edg\//.test(ua)) parts.push("Edge");
	else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) parts.push("Chrome");
	else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) parts.push("Safari");

	return parts.length > 0 ? parts.join(" · ") : "Unknown device";
}

export function SessionsCard() {
	const { data: session } = authClient.useSession();
	const { data: sessions, isLoading } = useListSessions();
	const revokeSession = useRevokeSession();
	const currentToken = session?.session?.token;

	const activeSessions = sessions?.filter(
		(s) => new Date(s.expiresAt) > new Date(),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm font-medium">
					<Clock className="h-4 w-4 text-muted-foreground" />
					Sessions
				</CardTitle>
				<CardDescription>
					Active sessions on your account
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="flex justify-center py-4">
						<Spinner size="sm" />
					</div>
				) : (
					<div className="space-y-3">
						{activeSessions?.map((s) => {
							const isCurrent = s.token === currentToken;
							return (
								<div
									key={s.id}
									className="flex items-center justify-between rounded-lg border border-border/50 p-3"
								>
									<div className="space-y-0.5">
										<p className="text-sm font-medium">
											{isCurrent ? "Current session" : parseUserAgent(s.userAgent)}
										</p>
										<p className="text-xs text-muted-foreground">
											{isCurrent
												? parseUserAgent(s.userAgent)
												: s.ipAddress ?? "Unknown IP"}
											{isCurrent && s.ipAddress ? ` · ${s.ipAddress}` : ""}
										</p>
									</div>
									{isCurrent ? (
										<Badge
											variant="outline"
											className="text-xs text-status-healthy"
										>
											Active
										</Badge>
									) : (
										<Button
											variant="ghost"
											size="sm"
											className="text-xs text-muted-foreground"
											disabled={revokeSession.isPending}
											onClick={() => {
												revokeSession.mutate(
													{ token: s.token },
													{
														onSuccess: () =>
															toast.success("Session revoked."),
													},
												);
											}}
										>
											Revoke
										</Button>
									)}
								</div>
							);
						})}
						{activeSessions?.length === 0 && (
							<p className="text-sm text-muted-foreground">
								No active sessions found.
							</p>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

import { CheckCircle2, Clock, Shield } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import type { BackupEntry } from "#/lib/types";
import { useVerifyBackup, useDeleteBackup } from "#/hooks/homelab";

export function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function BackupTable({ backups }: { backups: BackupEntry[] }) {
	const navigate = useNavigate();
	const verifyMutation = useVerifyBackup();
	const deleteMutation = useDeleteBackup();

	if (backups.length === 0) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-sm text-muted-foreground">
					No backups found.
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardContent className="px-2 py-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Size</TableHead>
							<TableHead className="text-center">Apps</TableHead>
							<TableHead className="text-center">Encrypted</TableHead>
							<TableHead className="text-center">Verified</TableHead>
							{backups[0]?.location === "remote" && (
								<TableHead>Remote</TableHead>
							)}
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{backups.map((backup) => {
							const key = `${backup.date}-${backup.location}-${backup.remote ?? ""}`;
							return (
								<TableRow key={key}>
									<TableCell className="font-mono-data text-xs">
										{formatDate(backup.date)}
									</TableCell>
									<TableCell className="font-mono-data text-xs">
										{backup.size}
									</TableCell>
									<TableCell className="text-center font-mono-data text-xs">
										{backup.apps}
									</TableCell>
									<TableCell className="text-center">
										{backup.encrypted ? (
											<Shield className="mx-auto h-3.5 w-3.5 text-status-healthy" />
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell className="text-center">
										{backup.verified ? (
											<CheckCircle2 className="mx-auto h-3.5 w-3.5 text-status-healthy" />
										) : (
											<Clock className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
										)}
									</TableCell>
									{backup.location === "remote" && (
										<TableCell className="font-mono-data text-xs">
											{backup.remote}
										</TableCell>
									)}
									<TableCell className="text-right">
										<div className="flex justify-end gap-1">
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-xs"
												disabled={verifyMutation.isPending}
												onClick={() => {
													verifyMutation.mutate(
														{
															date: backup.date,
															remote: backup.location === "remote" ? backup.remote : undefined,
														},
														{
															onSuccess: (result) => {
																if (result.success) {
																	toast.success("Backup verified successfully.");
																} else {
																	toast.error("Backup verification failed.", {
																		description: result.output.slice(0, 200),
																	});
																}
															},
															onError: (err) =>
																toast.error(`Verify failed: ${err.message}`),
														},
													);
												}}
											>
												Verify
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-xs"
												onClick={() =>
													navigate({
														to: "/backup-restore",
														search: { tab: "restore" } as any,
													})
												}
											>
												Restore
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-xs text-status-critical"
												disabled={deleteMutation.isPending}
												onClick={() => {
													deleteMutation.mutate(
														{
															date: backup.date,
															location: backup.location,
														},
														{
															onSuccess: (result) => {
																if (result.success) {
																	toast.success("Backup deleted.");
																} else {
																	toast.error("Failed to delete backup.", {
																		description: result.output.slice(0, 200),
																	});
																}
															},
															onError: (err) =>
																toast.error(`Delete failed: ${err.message}`),
														},
													);
												}}
											>
												Delete
											</Button>
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

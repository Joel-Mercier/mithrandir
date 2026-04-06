import { Fingerprint, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Spinner } from "#/components/ui/spinner";
import { useAddPasskey, useDeletePasskey, useListPasskeys } from "#/hooks/auth";
import { m } from "#/paraglide/messages.js";

export function PasskeyCard() {
	const { data: passkeys, isLoading } = useListPasskeys();
	const [addOpen, setAddOpen] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-sm font-medium">
						<Fingerprint className="h-4 w-4 text-muted-foreground" />
						{m.passkeyCard_title()}
					</CardTitle>
					<CardDescription>{m.passkeyCard_description()}</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex justify-center py-4">
							<Spinner size="sm" />
						</div>
					) : passkeys && passkeys.length > 0 ? (
						<div className="space-y-3">
							{passkeys.map((pk) => (
								<div
									key={pk.id}
									className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
								>
									<div className="flex items-center gap-3">
										<div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
											<Fingerprint className="h-4 w-4 text-primary" />
										</div>
										<div>
											<p className="text-sm font-medium">
												{pk.name || "Passkey"}
											</p>
											<div className="flex items-center gap-2 text-xs text-muted-foreground">
												<span>
													{m.passkeyCard_createdAt()}{" "}
													{new Date(pk.createdAt).toLocaleDateString(
														undefined,
														{
															month: "short",
															day: "numeric",
															year: "numeric",
														},
													)}
												</span>
												<Badge
													variant="outline"
													className="text-[10px] px-1.5 py-0"
												>
													{pk.deviceType === "singleDevice"
														? m.passkeyCard_singleDevice()
														: m.passkeyCard_multiDevice()}
												</Badge>
											</div>
										</div>
									</div>
									<Button
										size="icon"
										variant="ghost"
										className="h-8 w-8 text-muted-foreground hover:text-status-critical"
										onClick={() => setDeleteId(pk.id)}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							))}
							<Button
								size="sm"
								variant="outline"
								className="w-full gap-1.5"
								onClick={() => setAddOpen(true)}
							>
								<Plus className="h-3.5 w-3.5" />
								{m.passkeyCard_addPasskey()}
							</Button>
						</div>
					) : (
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm text-muted-foreground">
								{m.passkeyCard_noPasskeys()}
							</p>
							<Button
								size="sm"
								className="gap-1.5"
								onClick={() => setAddOpen(true)}
							>
								<Fingerprint className="h-3.5 w-3.5" />
								{m.passkeyCard_addPasskey()}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			<AddPasskeyDialog open={addOpen} onOpenChange={setAddOpen} />
			<DeletePasskeyDialog
				passkeyId={deleteId}
				onOpenChange={(open) => {
					if (!open) setDeleteId(null);
				}}
			/>
		</>
	);
}

function AddPasskeyDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [name, setName] = useState("");
	const addPasskey = useAddPasskey();

	function reset() {
		setName("");
		addPasskey.reset();
	}

	function handleOpenChange(value: boolean) {
		if (!value) reset();
		onOpenChange(value);
	}

	async function handleAdd() {
		addPasskey.mutate(
			{ name: name.trim() || undefined },
			{
				onSuccess: () => {
					toast.success(m.passkeyCard_added());
					handleOpenChange(false);
				},
			},
		);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md bg-background/95 backdrop-blur">
				<DialogHeader>
					<DialogTitle>{m.passkeyCard_addTitle()}</DialogTitle>
					<DialogDescription>
						{m.passkeyCard_addDescription()}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="passkey-name">
							{m.passkeyCard_nameLabel()}
						</Label>
						<Input
							id="passkey-name"
							placeholder={m.passkeyCard_namePlaceholder()}
							value={name}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleAdd()}
							autoFocus
						/>
					</div>
					{addPasskey.error && (
						<p className="text-sm text-status-critical">
							{addPasskey.error.message ?? m.passkeyCard_addFailed()}
						</p>
					)}
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => handleOpenChange(false)}
					>
						{m.common_cancel()}
					</Button>
					<Button
						onClick={handleAdd}
						disabled={addPasskey.isPending}
						className="gap-2"
					>
						{addPasskey.isPending && (
							<Spinner size="sm" className="text-primary-foreground" />
						)}
						{addPasskey.isPending
							? m.passkeyCard_adding()
							: m.passkeyCard_addPasskey()}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DeletePasskeyDialog({
	passkeyId,
	onOpenChange,
}: {
	passkeyId: string | null;
	onOpenChange: (open: boolean) => void;
}) {
	const deletePasskey = useDeletePasskey();

	async function handleDelete() {
		if (!passkeyId) return;
		deletePasskey.mutate(
			{ id: passkeyId },
			{
				onSuccess: () => {
					toast.success(m.passkeyCard_deleted());
					onOpenChange(false);
				},
				onError: (error) => {
					toast.error(error.message ?? m.passkeyCard_deleteFailed());
				},
			},
		);
	}

	return (
		<AlertDialog open={!!passkeyId} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{m.passkeyCard_deleteTitle()}</AlertDialogTitle>
					<AlertDialogDescription>
						{m.passkeyCard_deleteDescription()}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
						disabled={deletePasskey.isPending}
					>
						{deletePasskey.isPending && (
							<Spinner size="sm" className="text-destructive-foreground" />
						)}
						{m.common_delete()}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

import { Fingerprint, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
import {
	useAddPasskey,
	useDeletePasskey,
	useListPasskeys,
	useRenamePasskey,
} from "#/hooks/auth";
import { m } from "#/paraglide/messages.js";

type Passkey = {
	id: string;
	name?: string | null;
	deviceType: string;
	backedUp: boolean;
	createdAt: string | Date;
};

function formatDate(value: string | Date): string {
	const d = typeof value === "string" ? new Date(value) : value;
	return d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function PasskeyCard() {
	const { data: passkeys, isLoading } = useListPasskeys();
	const [addOpen, setAddOpen] = useState(false);
	const [renaming, setRenaming] = useState<Passkey | null>(null);
	const [deleting, setDeleting] = useState<Passkey | null>(null);

	const list = (passkeys ?? []) as Passkey[];

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
					) : list.length === 0 ? (
						<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-8">
							<div className="rounded-full bg-muted p-3">
								<KeyRound className="h-5 w-5 text-muted-foreground" />
							</div>
							<div className="text-center">
								<p className="text-sm font-medium">
									{m.passkeyCard_emptyTitle()}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{m.passkeyCard_emptyDescription()}
								</p>
							</div>
							<Button
								size="sm"
								className="gap-1.5"
								onClick={() => setAddOpen(true)}
							>
								<Plus className="h-3.5 w-3.5" />
								{m.passkeyCard_add()}
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							{list.map((p) => (
								<div
									key={p.id}
									className="flex items-center justify-between rounded-lg border border-border/50 p-3"
								>
									<div className="flex items-center gap-3">
										<div className="rounded-md bg-muted p-2">
											<Fingerprint className="h-4 w-4 text-muted-foreground" />
										</div>
										<div className="space-y-0.5">
											<div className="flex items-center gap-2">
												<p className="text-sm font-medium">
													{p.name || m.passkeyCard_unnamed()}
												</p>
												{p.backedUp && (
													<Badge variant="outline" className="text-xs">
														{m.passkeyCard_synced()}
													</Badge>
												)}
											</div>
											<p className="text-xs text-muted-foreground">
												{p.deviceType === "singleDevice"
													? m.passkeyCard_deviceBound()
													: m.passkeyCard_multiDevice()}
												{" · "}
												{m.passkeyCard_addedOn({ date: formatDate(p.createdAt) })}
											</p>
										</div>
									</div>
									<div className="flex gap-1">
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground"
											onClick={() => setRenaming(p)}
											aria-label={m.passkeyCard_rename()}
										>
											<Pencil className="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground hover:text-status-critical"
											onClick={() => setDeleting(p)}
											aria-label={m.common_delete()}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
							))}
							<Button
								variant="outline"
								size="sm"
								className="w-full gap-1.5"
								onClick={() => setAddOpen(true)}
							>
								<Plus className="h-3.5 w-3.5" />
								{m.passkeyCard_add()}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			<AddPasskeyDialog open={addOpen} onOpenChange={setAddOpen} />
			<RenamePasskeyDialog
				passkey={renaming}
				onOpenChange={(open) => !open && setRenaming(null)}
			/>
			<DeletePasskeyDialog
				passkey={deleting}
				onOpenChange={(open) => !open && setDeleting(null)}
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
	const [error, setError] = useState("");
	const addPasskey = useAddPasskey();

	function reset() {
		setName("");
		setError("");
	}

	function handleOpenChange(value: boolean) {
		if (!value) reset();
		onOpenChange(value);
	}

	async function handleAdd() {
		setError("");
		addPasskey.mutate(
			{ name: name.trim() || "Passkey" },
			{
				onSuccess: () => {
					toast.success(m.passkeyCard_added());
					handleOpenChange(false);
				},
				onError: (err) => {
					setError(err.message ?? m.passkeyCard_addFailed());
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
						<Label htmlFor="passkey-name">{m.passkeyCard_nameLabel()}</Label>
						<Input
							id="passkey-name"
							placeholder={m.passkeyCard_namePlaceholder()}
							value={name}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleAdd()}
							autoFocus
						/>
						<p className="text-xs text-muted-foreground">
							{m.passkeyCard_nameHint()}
						</p>
					</div>
					{error && <p className="text-sm text-status-critical">{error}</p>}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						{m.common_cancel()}
					</Button>
					<Button
						onClick={handleAdd}
						disabled={addPasskey.isPending}
						className="gap-2"
					>
						{addPasskey.isPending ? (
							<Spinner size="sm" className="text-primary-foreground" />
						) : (
							<Fingerprint className="h-4 w-4" />
						)}
						{addPasskey.isPending
							? m.passkeyCard_registering()
							: m.passkeyCard_register()}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function RenamePasskeyDialog({
	passkey,
	onOpenChange,
}: {
	passkey: Passkey | null;
	onOpenChange: (open: boolean) => void;
}) {
	const [name, setName] = useState("");
	const renamePasskey = useRenamePasskey();

	const open = passkey !== null;

	function handleOpenChange(value: boolean) {
		if (!value) setName("");
		onOpenChange(value);
	}

	function handleRename() {
		if (!passkey) return;
		const trimmed = name.trim();
		if (!trimmed) return;
		renamePasskey.mutate(
			{ id: passkey.id, name: trimmed },
			{
				onSuccess: () => {
					toast.success(m.passkeyCard_renamed());
					handleOpenChange(false);
				},
				onError: (err) => {
					toast.error(err.message ?? m.passkeyCard_renameFailed());
				},
			},
		);
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(value) => {
				if (value && passkey) setName(passkey.name ?? "");
				handleOpenChange(value);
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{m.passkeyCard_renameTitle()}</DialogTitle>
					<DialogDescription>
						{m.passkeyCard_renameDescription()}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="rename-passkey">{m.passkeyCard_nameLabel()}</Label>
					<Input
						id="rename-passkey"
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleRename()}
						autoFocus
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						{m.common_cancel()}
					</Button>
					<Button
						onClick={handleRename}
						disabled={renamePasskey.isPending || !name.trim()}
						className="gap-2"
					>
						{renamePasskey.isPending && (
							<Spinner size="sm" className="text-primary-foreground" />
						)}
						{m.common_save()}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DeletePasskeyDialog({
	passkey,
	onOpenChange,
}: {
	passkey: Passkey | null;
	onOpenChange: (open: boolean) => void;
}) {
	const deletePasskey = useDeletePasskey();
	const open = passkey !== null;

	function handleDelete() {
		if (!passkey) return;
		deletePasskey.mutate(
			{ id: passkey.id },
			{
				onSuccess: () => {
					toast.success(m.passkeyCard_deleted());
					onOpenChange(false);
				},
				onError: (err) => {
					toast.error(err.message ?? m.passkeyCard_deleteFailed());
				},
			},
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{m.passkeyCard_deleteTitle()}</DialogTitle>
					<DialogDescription>
						{m.passkeyCard_deleteDescription({
							name: passkey?.name || m.passkeyCard_unnamed(),
						})}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{m.common_cancel()}
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={deletePasskey.isPending}
						className="gap-2"
					>
						{deletePasskey.isPending && (
							<Spinner size="sm" className="text-destructive-foreground" />
						)}
						{m.common_delete()}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

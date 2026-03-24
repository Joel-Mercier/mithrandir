import { Copy, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";
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
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "#/components/ui/input-otp";
import { Label } from "#/components/ui/label";
import { Spinner } from "#/components/ui/spinner";
import { authClient } from "#/lib/auth-client";
import { m } from "#/paraglide/messages.js";

type SetupStep = "password" | "qr" | "verify" | "backup-codes";

export function TwoFactorCard() {
	const { data: session } = authClient.useSession();
	const user = session!.user;
	const [setupOpen, setSetupOpen] = useState(false);
	const [disableOpen, setDisableOpen] = useState(false);
	const [backupCodesOpen, setBackupCodesOpen] = useState(false);

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-sm font-medium">
						<Smartphone className="h-4 w-4 text-muted-foreground" />
						{m.twoFactorCard_title()}
					</CardTitle>
					<CardDescription>
						{user.twoFactorEnabled
							? m.twoFactorCard_enabledDescription()
							: m.twoFactorCard_disabledDescription()}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{user.twoFactorEnabled ? (
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-2">
								<ShieldCheck className="h-5 w-5 text-status-healthy" />
								<span className="text-sm font-medium">
									{m.twoFactorCard_isEnabled()}
								</span>
							</div>
							<div className="flex gap-2">
								<Button
									size="sm"
									variant="outline"
									className="gap-1.5"
									onClick={() => setBackupCodesOpen(true)}
								>
									<Copy className="h-3.5 w-3.5" />
									{m.twoFactorCard_regenerateBackupCodes()}
								</Button>
								<Button
									size="sm"
									variant="outline"
									className="gap-1.5 text-status-critical hover:text-status-critical"
									onClick={() => setDisableOpen(true)}
								>
									<ShieldOff className="h-3.5 w-3.5" />
									{m.twoFactorCard_disable()}
								</Button>
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm text-muted-foreground">
								{m.twoFactorCard_useAuthenticator()}
							</p>
							<Button
								size="sm"
								className="gap-1.5"
								onClick={() => setSetupOpen(true)}
							>
								<ShieldCheck className="h-3.5 w-3.5" />
								{m.twoFactorCard_enable()}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			<SetupTwoFactorDialog open={setupOpen} onOpenChange={setSetupOpen} />
			<DisableTwoFactorDialog
				open={disableOpen}
				onOpenChange={setDisableOpen}
			/>
			<BackupCodesDialog
				open={backupCodesOpen}
				onOpenChange={setBackupCodesOpen}
			/>
		</>
	);
}

function SetupTwoFactorDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [step, setStep] = useState<SetupStep>("password");
	const [password, setPassword] = useState("");
	const [totpURI, setTotpURI] = useState("");
	const [secret, setSecret] = useState("");
	const [backupCodes, setBackupCodes] = useState<string[]>([]);
	const [code, setCode] = useState("");
	const [error, setError] = useState("");
	const [isPending, setIsPending] = useState(false);

	function reset() {
		setStep("password");
		setPassword("");
		setTotpURI("");
		setSecret("");
		setBackupCodes([]);
		setCode("");
		setError("");
		setIsPending(false);
	}

	function handleOpenChange(value: boolean) {
		if (!value) reset();
		onOpenChange(value);
	}

	async function handleEnable() {
		setError("");
		setIsPending(true);
		const { data, error: enableError } = await authClient.twoFactor.enable({
			password,
		});
		setIsPending(false);
		if (enableError) {
			setError(enableError.message ?? m.twoFactorCard_enableFailed());
			return;
		}
		if (data) {
			setTotpURI(data.totpURI);
			const secretMatch = data.totpURI.match(/[?&]secret=([^&]+)/);
			setSecret(secretMatch?.[1] ?? "");
			setBackupCodes(data.backupCodes ?? []);
			setStep("qr");
		}
	}

	async function handleVerify() {
		setError("");
		setIsPending(true);
		const { error: verifyError } = await authClient.twoFactor.verifyTotp({
			code,
		});
		setIsPending(false);
		if (verifyError) {
			setError(verifyError.message ?? m.twoFactorCard_invalidCode());
			return;
		}
		toast.success(m.twoFactorCard_enabled());
		setStep("backup-codes");
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				{step === "password" && (
					<>
						<DialogHeader>
							<DialogTitle>{m.twoFactorCard_enableTitle()}</DialogTitle>
							<DialogDescription>
								{m.twoFactorCard_enterPassword()}
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="2fa-password">{m.common_password()}</Label>
								<Input
									id="2fa-password"
									type="password"
									placeholder="••••••••"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleEnable()}
									autoFocus
								/>
							</div>
							{error && <p className="text-sm text-status-critical">{error}</p>}
						</div>
						<DialogFooter>
							<Button
								onClick={handleEnable}
								disabled={isPending || !password}
								className="gap-2"
							>
								{isPending && (
									<Spinner size="sm" className="text-primary-foreground" />
								)}
								{m.common_continue()}
							</Button>
						</DialogFooter>
					</>
				)}

				{step === "qr" && (
					<>
						<DialogHeader>
							<DialogTitle>{m.twoFactorCard_scanQR()}</DialogTitle>
							<DialogDescription>
								{m.twoFactorCard_scanDescription()}
							</DialogDescription>
						</DialogHeader>
						<div className="flex flex-col items-center gap-4">
							<div className="rounded-xl border bg-white p-4">
								<QRCodeSVG value={totpURI} size={200} />
							</div>
							{secret && (
								<div className="w-full space-y-1.5">
									<p className="text-center text-xs text-muted-foreground">
										{m.twoFactorCard_manualKey()}
									</p>
									<button
										type="button"
										className="flex w-full items-center justify-center gap-2 rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs tracking-widest transition-colors hover:bg-muted"
										onClick={() => {
											navigator.clipboard.writeText(secret);
											toast.success(m.twoFactorCard_secretCopied());
										}}
									>
										{secret}
										<Copy className="h-3 w-3 shrink-0 text-muted-foreground" />
									</button>
								</div>
							)}
						</div>
						<DialogFooter>
							<Button onClick={() => setStep("verify")}>
								{m.twoFactorCard_scannedCode()}
							</Button>
						</DialogFooter>
					</>
				)}

				{step === "verify" && (
					<>
						<DialogHeader>
							<DialogTitle>{m.twoFactorCard_verifyCode()}</DialogTitle>
							<DialogDescription>
								{m.twoFactorCard_verifyDescription()}
							</DialogDescription>
						</DialogHeader>
						<div className="flex flex-col items-center gap-4">
							<InputOTP
								maxLength={6}
								value={code}
								onChange={setCode}
								onComplete={handleVerify}
								autoFocus
							>
								<InputOTPGroup>
									<InputOTPSlot index={0} />
									<InputOTPSlot index={1} />
									<InputOTPSlot index={2} />
								</InputOTPGroup>
								<InputOTPSeparator />
								<InputOTPGroup>
									<InputOTPSlot index={3} />
									<InputOTPSlot index={4} />
									<InputOTPSlot index={5} />
								</InputOTPGroup>
							</InputOTP>
							{error && <p className="text-sm text-status-critical">{error}</p>}
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => {
									setStep("qr");
									setCode("");
									setError("");
								}}
							>
								{m.common_back()}
							</Button>
							<Button
								onClick={handleVerify}
								disabled={isPending || code.length < 6}
								className="gap-2"
							>
								{isPending && (
									<Spinner size="sm" className="text-primary-foreground" />
								)}
								{m.common_verify()}
							</Button>
						</DialogFooter>
					</>
				)}

				{step === "backup-codes" && (
					<>
						<DialogHeader>
							<DialogTitle>{m.twoFactorCard_saveBackupCodes()}</DialogTitle>
							<DialogDescription>
								{m.twoFactorCard_saveBackupDescription()}
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-3">
							<div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/50 p-4">
								{backupCodes.map((backupCode) => (
									<code
										key={backupCode}
										className="text-center font-mono text-sm tracking-wider"
									>
										{backupCode}
									</code>
								))}
							</div>
							<Button
								variant="outline"
								size="sm"
								className="w-full gap-1.5"
								onClick={() => {
									navigator.clipboard.writeText(backupCodes.join("\n"));
									toast.success(m.twoFactorCard_backupCodesCopied());
								}}
							>
								<Copy className="h-3.5 w-3.5" />
								{m.twoFactorCard_copyAllCodes()}
							</Button>
						</div>
						<DialogFooter>
							<Button
								onClick={() => {
									handleOpenChange(false);
									authClient.$store.notify("$sessionSignal");
								}}
							>
								{m.common_done()}
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}

function DisableTwoFactorDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isPending, setIsPending] = useState(false);

	function reset() {
		setPassword("");
		setError("");
		setIsPending(false);
	}

	function handleOpenChange(value: boolean) {
		if (!value) reset();
		onOpenChange(value);
	}

	async function handleDisable() {
		setError("");
		setIsPending(true);
		const { error: disableError } = await authClient.twoFactor.disable({
			password,
		});
		setIsPending(false);
		if (disableError) {
			setError(disableError.message ?? m.twoFactorCard_disableFailed());
			return;
		}
		toast.success(m.twoFactorCard_disabled());
		handleOpenChange(false);
		window.location.reload();
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{m.twoFactorCard_disableTitle()}</DialogTitle>
					<DialogDescription>
						{m.twoFactorCard_disableDescription()}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="disable-2fa-password">{m.common_password()}</Label>
						<Input
							id="disable-2fa-password"
							type="password"
							placeholder="••••••••"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleDisable()}
							autoFocus
						/>
					</div>
					{error && <p className="text-sm text-status-critical">{error}</p>}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						{m.common_cancel()}
					</Button>
					<Button
						variant="destructive"
						onClick={handleDisable}
						disabled={isPending || !password}
						className="gap-2"
					>
						{isPending && (
							<Spinner size="sm" className="text-destructive-foreground" />
						)}
						{m.twoFactorCard_disable2FA()}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function BackupCodesDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [password, setPassword] = useState("");
	const [codes, setCodes] = useState<string[]>([]);
	const [error, setError] = useState("");
	const [isPending, setIsPending] = useState(false);

	function reset() {
		setPassword("");
		setCodes([]);
		setError("");
		setIsPending(false);
	}

	function handleOpenChange(value: boolean) {
		if (!value) reset();
		onOpenChange(value);
	}

	async function handleGenerate() {
		setError("");
		setIsPending(true);
		const { data, error: genError } =
			await authClient.twoFactor.generateBackupCodes({ password });
		setIsPending(false);
		if (genError) {
			setError(genError.message ?? m.twoFactorCard_generateFailed());
			return;
		}
		if (data?.backupCodes) {
			setCodes(data.backupCodes);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{m.twoFactorCard_backupCodesTitle()}</DialogTitle>
					<DialogDescription>
						{codes.length > 0
							? m.twoFactorCard_backupCodesNewDescription()
							: m.twoFactorCard_backupCodesEnterPassword()}
					</DialogDescription>
				</DialogHeader>

				{codes.length > 0 ? (
					<div className="space-y-3">
						<div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/50 p-4">
							{codes.map((backupCode) => (
								<code
									key={backupCode}
									className="text-center font-mono text-sm tracking-wider"
								>
									{backupCode}
								</code>
							))}
						</div>
						<Button
							variant="outline"
							size="sm"
							className="w-full gap-1.5"
							onClick={() => {
								navigator.clipboard.writeText(codes.join("\n"));
								toast.success(m.twoFactorCard_backupCodesCopied());
							}}
						>
							<Copy className="h-3.5 w-3.5" />
							{m.twoFactorCard_copyAllCodes()}
						</Button>
					</div>
				) : (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="backup-codes-password">
								{m.common_password()}
							</Label>
							<Input
								id="backup-codes-password"
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
								autoFocus
							/>
						</div>
						{error && <p className="text-sm text-status-critical">{error}</p>}
					</div>
				)}

				<DialogFooter>
					{codes.length > 0 ? (
						<Button onClick={() => handleOpenChange(false)}>
							{m.common_done()}
						</Button>
					) : (
						<>
							<Button variant="outline" onClick={() => handleOpenChange(false)}>
								{m.common_cancel()}
							</Button>
							<Button
								onClick={handleGenerate}
								disabled={isPending || !password}
								className="gap-2"
							>
								{isPending && (
									<Spinner size="sm" className="text-primary-foreground" />
								)}
								{m.twoFactorCard_generateNewCodes()}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

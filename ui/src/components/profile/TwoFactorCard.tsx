import { Copy, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
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
						Two-Factor Authentication
					</CardTitle>
					<CardDescription>
						{user.twoFactorEnabled
							? "Your account is protected with two-factor authentication"
							: "Add an extra layer of security to your account"}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{user.twoFactorEnabled ? (
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-2">
								<ShieldCheck className="h-5 w-5 text-status-healthy" />
								<span className="text-sm font-medium">2FA is enabled</span>
							</div>
							<div className="flex gap-2">
								<Button
									size="sm"
									variant="outline"
									className="gap-1.5"
									onClick={() => setBackupCodesOpen(true)}
								>
									<Copy className="h-3.5 w-3.5" />
									Regenerate Backup Codes
								</Button>
								<Button
									size="sm"
									variant="outline"
									className="gap-1.5 text-status-critical hover:text-status-critical"
									onClick={() => setDisableOpen(true)}
								>
									<ShieldOff className="h-3.5 w-3.5" />
									Disable
								</Button>
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm text-muted-foreground">
								Use an authenticator app to generate one-time codes.
							</p>
							<Button
								size="sm"
								className="gap-1.5"
								onClick={() => setSetupOpen(true)}
							>
								<ShieldCheck className="h-3.5 w-3.5" />
								Enable 2FA
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			<SetupTwoFactorDialog
				open={setupOpen}
				onOpenChange={setSetupOpen}
			/>
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
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
			setError(enableError.message ?? "Failed to enable 2FA.");
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
			setError(verifyError.message ?? "Invalid code.");
			return;
		}
		toast.success("Two-factor authentication enabled.");
		setStep("backup-codes");
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				{step === "password" && (
					<>
						<DialogHeader>
							<DialogTitle>Enable Two-Factor Authentication</DialogTitle>
							<DialogDescription>
								Enter your password to begin setup
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="2fa-password">Password</Label>
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
							{error && (
								<p className="text-sm text-status-critical">{error}</p>
							)}
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
								Continue
							</Button>
						</DialogFooter>
					</>
				)}

				{step === "qr" && (
					<>
						<DialogHeader>
							<DialogTitle>Scan QR Code</DialogTitle>
							<DialogDescription>
								Scan this code with your authenticator app (Google Authenticator,
								Authy, etc.)
							</DialogDescription>
						</DialogHeader>
						<div className="flex flex-col items-center gap-4">
							<div className="rounded-xl border bg-white p-4">
								<QRCodeSVG value={totpURI} size={200} />
							</div>
							{secret && (
								<div className="w-full space-y-1.5">
									<p className="text-center text-xs text-muted-foreground">
										Or enter this key manually:
									</p>
									<button
										type="button"
										className="flex w-full items-center justify-center gap-2 rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs tracking-widest transition-colors hover:bg-muted"
										onClick={() => {
											navigator.clipboard.writeText(secret);
											toast.success("Secret copied to clipboard.");
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
								I've scanned the code
							</Button>
						</DialogFooter>
					</>
				)}

				{step === "verify" && (
					<>
						<DialogHeader>
							<DialogTitle>Verify Code</DialogTitle>
							<DialogDescription>
								Enter the 6-digit code from your authenticator app to confirm
								setup
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
							{error && (
								<p className="text-sm text-status-critical">{error}</p>
							)}
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
								Back
							</Button>
							<Button
								onClick={handleVerify}
								disabled={isPending || code.length < 6}
								className="gap-2"
							>
								{isPending && (
									<Spinner size="sm" className="text-primary-foreground" />
								)}
								Verify
							</Button>
						</DialogFooter>
					</>
				)}

				{step === "backup-codes" && (
					<>
						<DialogHeader>
							<DialogTitle>Save Your Backup Codes</DialogTitle>
							<DialogDescription>
								Store these codes in a safe place. Each code can only be used
								once to sign in if you lose access to your authenticator.
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
									toast.success("Backup codes copied to clipboard.");
								}}
							>
								<Copy className="h-3.5 w-3.5" />
								Copy All Codes
							</Button>
						</div>
						<DialogFooter>
							<Button
								onClick={() => {
									handleOpenChange(false);
									authClient.$store.notify("$sessionSignal");
								}}
							>
								Done
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
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
			setError(disableError.message ?? "Failed to disable 2FA.");
			return;
		}
		toast.success("Two-factor authentication disabled.");
		handleOpenChange(false);
		window.location.reload();
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Disable Two-Factor Authentication</DialogTitle>
					<DialogDescription>
						This will remove the extra security from your account. Enter your
						password to confirm.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="disable-2fa-password">Password</Label>
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
						Cancel
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
						Disable 2FA
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function BackupCodesDialog({
	open,
	onOpenChange,
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
			setError(genError.message ?? "Failed to generate backup codes.");
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
					<DialogTitle>Backup Codes</DialogTitle>
					<DialogDescription>
						{codes.length > 0
							? "Store these new codes safely. Previous codes have been invalidated."
							: "Enter your password to generate new backup codes. This will invalidate any existing codes."}
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
								toast.success("Backup codes copied to clipboard.");
							}}
						>
							<Copy className="h-3.5 w-3.5" />
							Copy All Codes
						</Button>
					</div>
				) : (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="backup-codes-password">Password</Label>
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
						{error && (
							<p className="text-sm text-status-critical">{error}</p>
						)}
					</div>
				)}

				<DialogFooter>
					{codes.length > 0 ? (
						<Button onClick={() => handleOpenChange(false)}>Done</Button>
					) : (
						<>
							<Button
								variant="outline"
								onClick={() => handleOpenChange(false)}
							>
								Cancel
							</Button>
							<Button
								onClick={handleGenerate}
								disabled={isPending || !password}
								className="gap-2"
							>
								{isPending && (
									<Spinner size="sm" className="text-primary-foreground" />
								)}
								Generate New Codes
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

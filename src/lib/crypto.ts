import { shell } from "@/lib/shell.js";
import { resolveOwnership } from "@/lib/tar.js";
import { ENCRYPTED_EXT } from "@/lib/backup-utils.js";

/**
 * Encrypt a .tar.zst file using AES-256-CBC with PBKDF2 key derivation.
 * Removes the original file after encryption.
 * Returns the path to the encrypted file (.tar.zst.enc).
 */
export async function encryptFile(
  inputPath: string,
  password: string,
): Promise<string> {
  const outputPath = `${inputPath}.enc`;
  const result = await shell(
    "openssl",
    [
      "enc",
      "-aes-256-cbc",
      "-salt",
      "-pbkdf2",
      "-iter",
      "100000",
      "-in",
      inputPath,
      "-out",
      outputPath,
      "-pass",
      `pass:${password}`,
    ],
    { sudo: true, ignoreError: true },
  );
  if ((result.exitCode ?? 0) !== 0) {
    throw new Error(
      `Encryption failed (exit ${result.exitCode}): ${result.stderr}`,
    );
  }
  // Fix ownership so non-root user can manage the file
  const ownership = await resolveOwnership();
  await shell("chown", [ownership, outputPath], { sudo: true });
  // Remove the original unencrypted file
  await shell("rm", ["-f", inputPath], { sudo: true });
  return outputPath;
}

/**
 * Decrypt a .tar.zst.enc file back to .tar.zst.
 * Does NOT remove the encrypted file.
 * Returns the path to the decrypted file.
 */
export async function decryptFile(
  inputPath: string,
  password: string,
): Promise<string> {
  if (!inputPath.endsWith(ENCRYPTED_EXT)) {
    throw new Error(`Not an encrypted backup: ${inputPath}`);
  }
  const outputPath = inputPath.slice(0, -4); // strip .enc
  const result = await shell(
    "openssl",
    [
      "enc",
      "-aes-256-cbc",
      "-d",
      "-salt",
      "-pbkdf2",
      "-iter",
      "100000",
      "-in",
      inputPath,
      "-out",
      outputPath,
      "-pass",
      `pass:${password}`,
    ],
    { ignoreError: true },
  );
  if ((result.exitCode ?? 0) !== 0) {
    // Clean up partial output
    await shell("rm", ["-f", outputPath], { ignoreError: true });
    throw new Error("Incorrect password or corrupted file");
  }
  return outputPath;
}

/** Check if a file path is an encrypted backup */
export function isEncryptedBackup(filePath: string): boolean {
  return filePath.endsWith(ENCRYPTED_EXT);
}

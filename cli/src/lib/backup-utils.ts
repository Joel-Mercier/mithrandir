import { existsSync } from "fs";

export const ARCHIVE_EXT = ".tar.zst";
export const ENCRYPTED_EXT = ".tar.zst.enc";

/** Strip .tar.zst.enc or .tar.zst suffix for display */
export function stripArchiveSuffix(filename: string): string {
  if (filename.endsWith(ENCRYPTED_EXT)) {
    return filename.slice(0, -ENCRYPTED_EXT.length);
  }
  return filename.replace(/\.tar\.zst$/, "");
}

/** Check if filename is a backup archive (encrypted or not) */
export function isBackupArchive(filename: string): boolean {
  return filename.endsWith(ENCRYPTED_EXT) || filename.endsWith(ARCHIVE_EXT);
}

/** Get the archive filename for an app */
export function getArchiveFilename(
  appName: string,
  encrypted: boolean,
): string {
  return `${appName}${encrypted ? ENCRYPTED_EXT : ARCHIVE_EXT}`;
}

/**
 * Find a backup archive file for an app in a directory.
 * Prefers .tar.zst.enc over .tar.zst when both exist.
 * Returns the full path or null.
 */
export function findArchiveFile(
  dir: string,
  appName: string,
): string | null {
  const encPath = `${dir}/${appName}${ENCRYPTED_EXT}`;
  if (existsSync(encPath)) return encPath;
  const plainPath = `${dir}/${appName}${ARCHIVE_EXT}`;
  if (existsSync(plainPath)) return plainPath;
  return null;
}

#!/usr/bin/env bun
/**
 * Downloads the tusd binary for the current platform from GitHub releases.
 * Skips download if the correct version is already cached in ui/.tusd/.
 */
import { existsSync } from "fs";
import { chmod, mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";

const TUSD_VERSION = "2.9.2";
const TUSD_DIR = join(import.meta.dirname, "../.tusd");
const TUSD_BIN = join(TUSD_DIR, "tusd");
const VERSION_FILE = join(TUSD_DIR, ".version");

function getPlatformAsset(): string {
	const platform = process.platform === "darwin" ? "darwin" : "linux";
	const arch = process.arch === "arm64" ? "arm64" : "amd64";
	const ext = platform === "darwin" ? "zip" : "tar.gz";
	return `tusd_${platform}_${arch}.${ext}`;
}

async function isCorrectVersion(): Promise<boolean> {
	if (!existsSync(TUSD_BIN) || !existsSync(VERSION_FILE)) return false;
	const installed = (await readFile(VERSION_FILE, "utf-8")).trim();
	return installed === TUSD_VERSION;
}

async function download() {
	if (await isCorrectVersion()) {
		console.log(`[tusd] v${TUSD_VERSION} already installed`);
		return;
	}

	const asset = getPlatformAsset();
	const url = `https://github.com/tus/tusd/releases/download/v${TUSD_VERSION}/${asset}`;

	console.log(`[tusd] Downloading v${TUSD_VERSION} (${asset})...`);

	await mkdir(TUSD_DIR, { recursive: true });

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Download failed: ${response.status} ${response.statusText}`);
	}

	const archivePath = join(TUSD_DIR, asset);
	await writeFile(archivePath, new Uint8Array(await response.arrayBuffer()));

	// Extract binary
	if (asset.endsWith(".zip")) {
		const proc = Bun.spawnSync(["unzip", "-o", archivePath, "-d", TUSD_DIR]);
		if (proc.exitCode !== 0) throw new Error(`unzip failed: ${proc.stderr.toString()}`);
		// zip extracts into a subdirectory like tusd_darwin_arm64/tusd
		const subdir = asset.replace(".zip", "");
		const extractedBin = join(TUSD_DIR, subdir, "tusd");
		if (existsSync(extractedBin)) {
			await Bun.write(TUSD_BIN, Bun.file(extractedBin));
			await rm(join(TUSD_DIR, subdir), { recursive: true });
		}
	} else {
		const proc = Bun.spawnSync(["tar", "xzf", archivePath, "-C", TUSD_DIR]);
		if (proc.exitCode !== 0) throw new Error(`tar failed: ${proc.stderr.toString()}`);
		// tar extracts into a subdirectory like tusd_linux_amd64/tusd
		const subdir = asset.replace(".tar.gz", "");
		const extractedBin = join(TUSD_DIR, subdir, "tusd");
		if (existsSync(extractedBin)) {
			await Bun.write(TUSD_BIN, Bun.file(extractedBin));
			await rm(join(TUSD_DIR, subdir), { recursive: true });
		}
	}

	await rm(archivePath);
	await chmod(TUSD_BIN, 0o755);
	await writeFile(VERSION_FILE, TUSD_VERSION);

	console.log(`[tusd] Installed to ${TUSD_BIN}`);
}

download().catch((err) => {
	console.error("[tusd] Download failed:", err);
	process.exit(1);
});

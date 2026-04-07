import { existsSync, mkdirSync, readlinkSync, rmSync } from "fs";
import { basename, join } from "path";
import { shell } from "@/lib/shell.js";

const DEPLOYMENTS_DIR = ".deployments";
const SLOTS = ["blue", "green"] as const;
type Slot = (typeof SLOTS)[number];

/** Read which slot the `current` symlink points to. Defaults to "blue". */
export function getActiveSlot(uiDir: string): Slot {
  const currentLink = join(uiDir, DEPLOYMENTS_DIR, "current");
  try {
    const target = readlinkSync(currentLink);
    const name = basename(target) as Slot;
    return SLOTS.includes(name) ? name : "blue";
  } catch {
    return "blue";
  }
}

/** Return the slot that is NOT currently active. */
export function getInactiveSlot(uiDir: string): Slot {
  return getActiveSlot(uiDir) === "blue" ? "green" : "blue";
}

/**
 * Deploy a completed UI build (`.output/`) into the blue-green deployment
 * structure, atomically switch the `current` symlink, and clean up.
 *
 * 1. Copy `.output/` into the inactive slot
 * 2. Atomic symlink swap to the new slot
 * 3. Remove the old slot and `.output/` staging dir
 */
export async function deployUiBuild(uiDir: string): Promise<void> {
  const deploymentsDir = join(uiDir, DEPLOYMENTS_DIR);
  const outputDir = join(uiDir, ".output");

  if (!existsSync(join(outputDir, "server", "index.mjs"))) {
    throw new Error("No build output found at .output/server/index.mjs");
  }

  mkdirSync(deploymentsDir, { recursive: true });

  const activeSlot = getActiveSlot(uiDir);
  const inactiveSlot = getInactiveSlot(uiDir);
  const inactiveDir = join(deploymentsDir, inactiveSlot);

  // Clean and copy build output to inactive slot
  rmSync(inactiveDir, { recursive: true, force: true });
  await shell("cp", ["-r", outputDir, inactiveDir], { ignoreError: false });

  // Atomic symlink swap: create temp link then rename over current
  const tmpLink = join(deploymentsDir, `current.tmp.${Date.now()}`);
  await shell("ln", ["-sfn", inactiveSlot, tmpLink], { ignoreError: false });
  await shell("mv", ["-T", tmpLink, join(deploymentsDir, "current")], {
    ignoreError: false,
  });

  // Cleanup: remove old slot and staging dir
  const oldSlotDir = join(deploymentsDir, activeSlot);
  rmSync(oldSlotDir, { recursive: true, force: true });
  rmSync(outputDir, { recursive: true, force: true });
}

/**
 * Bootstrap the `.deployments/` structure from an existing `.output/` directory.
 * Used during first install or migration from the old layout.
 * No-op if `.deployments/current` already points to a valid build.
 */
async function bootstrapDeployment(uiDir: string): Promise<void> {
  const deploymentsDir = join(uiDir, DEPLOYMENTS_DIR);
  const currentLink = join(deploymentsDir, "current");
  const outputDir = join(uiDir, ".output");

  // Already set up and valid
  if (
    existsSync(currentLink) &&
    existsSync(join(deploymentsDir, "current", "server", "index.mjs"))
  ) {
    return;
  }

  // Need .output/ to bootstrap from
  if (!existsSync(join(outputDir, "server", "index.mjs"))) {
    return;
  }

  mkdirSync(deploymentsDir, { recursive: true });

  const slot: Slot = "blue";
  const slotDir = join(deploymentsDir, slot);

  rmSync(slotDir, { recursive: true, force: true });
  await shell("cp", ["-r", outputDir, slotDir], { ignoreError: false });
  await shell("ln", ["-sfn", slot, currentLink], { ignoreError: false });

  // Clean up staging dir
  rmSync(outputDir, { recursive: true, force: true });
}

/** Check if a valid deployment exists (for service readiness checks). */
export function hasValidDeployment(uiDir: string): boolean {
  return existsSync(
    join(uiDir, DEPLOYMENTS_DIR, "current", "server", "index.mjs"),
  );
}

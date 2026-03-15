import { chmod } from "fs/promises";
import { join, dirname } from "path";

const outdir = join(import.meta.dir, "dist");
const outfile = join(outdir, "mithrandir.js");

// Resolve signal-exit v4 ESM path at build-time.
// signal-exit is an indirect dep — locate it via Bun's resolver by
// looking through the restore-exit-info dependency (which requires v4).
import { existsSync } from "fs";

function findSignalExitMjs(): string {
  // Try direct resolution first (works with flat node_modules)
  try {
    const resolved = new URL(import.meta.resolve("signal-exit")).pathname;
    const candidate = join(dirname(resolved), "dist", "mjs", "index.js");
    if (existsSync(candidate)) return candidate;
  } catch {}

  // Bun stores deps in node_modules/.bun/ — scan for signal-exit@4
  const bunCache = join(dirname(import.meta.dir), "node_modules", ".bun");
  if (existsSync(bunCache)) {
    const { readdirSync } = require("fs");
    for (const entry of readdirSync(bunCache) as string[]) {
      if (entry.startsWith("signal-exit@4")) {
        const candidate = join(bunCache, entry, "node_modules", "signal-exit", "dist", "mjs", "index.js");
        if (existsSync(candidate)) return candidate;
      }
    }
  }

  throw new Error("Could not find signal-exit ESM module");
}

const signalExitMjs = findSignalExitMjs();

const result = await Bun.build({
  entrypoints: [join(import.meta.dir, "src/index.tsx")],
  outdir,
  target: "bun",
  naming: "mithrandir.js",
  plugins: [
    {
      name: "esm-compat",
      setup(build) {
        // react-devtools-core is an optional peer dep of ink, not needed at runtime
        build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
          path: "react-devtools-core",
          namespace: "stub",
        }));
        build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
          contents: "export default undefined;",
          loader: "js",
        }));

        // signal-exit ESM has no default export, but ink does `import signalExit from 'signal-exit'`.
        // Shim it to re-export onExit as default.
        build.onResolve({ filter: /^signal-exit$/ }, () => ({
          path: "signal-exit",
          namespace: "shim",
        }));
        build.onLoad({ filter: /.*/, namespace: "shim" }, () => ({
          contents: `export { onExit as default, onExit, load, unload, signals } from ${JSON.stringify(signalExitMjs)};`,
          loader: "js",
        }));
      },
    },
  ],
});

if (!result.success) {
  console.error("Build failed:");
  for (const msg of result.logs) {
    console.error(msg);
  }
  process.exit(1);
}

// Ensure shebang is present
const content = await Bun.file(outfile).text();
if (!content.startsWith("#!")) {
  await Bun.write(outfile, `#!/usr/bin/env bun\n${content}`);
}
await chmod(outfile, 0o755);

console.log(`Built: ${outfile}`);

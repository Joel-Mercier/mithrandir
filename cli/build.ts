import { chmod } from "fs/promises";
import { join } from "path";

const outdir = join(import.meta.dir, "dist");
const outfile = join(outdir, "homelab.js");

const result = await Bun.build({
  entrypoints: [join(import.meta.dir, "src/index.tsx")],
  outdir,
  target: "bun",
  naming: "homelab.js",
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
          contents: `export { onExit as default, onExit, load, unload, signals } from ${JSON.stringify(join(import.meta.dir, "node_modules/signal-exit/dist/mjs/index.js"))};`,
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

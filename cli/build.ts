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
      name: "stub-devtools",
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

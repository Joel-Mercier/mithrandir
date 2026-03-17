import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const isProduction = process.env.NODE_ENV === 'production'

const config = defineConfig({
  plugins: [
    devtools(),
    // Resolve path aliases from both UI and CLI tsconfigs so that
    // @mithrandir/cli source files can be bundled directly
    tsconfigPaths({ projects: ['./tsconfig.json', '../cli/tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    nitro({ preset: "bun" }),
    viteReact(),
  ],
  preview: {
    port: 3000,
  },
  ssr: {
    // Bundle all deps into the server output for Docker (no node_modules needed)
    // but only during production builds — dev needs normal CJS resolution
    ...(isProduction ? { noExternal: true } : {}),
    external: ["execa", "@libsql/client"],
  },
  build: {
    rollupOptions: {
      external: [/^node:/],
    },
  },
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          external: [/^node:/, "execa", /^@libsql\//],
        },
      },
    },
    nitro: {
      build: {
        rollupOptions: {
          external: [/^node:/, "execa", /^@libsql\//],
        },
      },
    },
  },
})

export default config

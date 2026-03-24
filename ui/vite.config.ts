import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      outputStructure: "message-modules",
      cookieName: "PARAGLIDE_LOCALE",
      strategy: ["url", "cookie", "preferredLanguage", "baseLocale"],
      urlPatterns: [
        {
          pattern: "/:path(.*)?",
          localized: [
            ["fr", "/fr/:path(.*)?"],
            ["en", "/:path(.*)?"],
          ],
        },
      ],
    }),
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
    external: ["@libsql/client"],
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
          external: [/^node:/, /^@libsql\//],
        },
      },
    },
    nitro: {
      build: {
        rollupOptions: {
          external: [/^node:/, /^@libsql\//],
        },
      },
    },
  },
})

export default config

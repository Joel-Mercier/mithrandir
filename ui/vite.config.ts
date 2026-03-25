import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
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
    tailwindcss(),
    tanstackStart(),
    nitro({ preset: "bun" }),
    viteReact(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  preview: {
    port: 3000,
  },
  ssr: {
    external: ["@libsql/client"],
  },
  build: {
    rolldownOptions: {
      external: [/^node:/],
    },
  },
  environments: {
    ssr: {
      build: {
        rolldownOptions: {
          external: [/^node:/, /^@libsql\//],
        },
      },
    },
    nitro: {
      build: {
        rolldownOptions: {
          external: [/^node:/, /^@libsql\//],
        },
      },
    },
  },
})

export default config

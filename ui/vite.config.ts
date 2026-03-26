import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig, type Plugin } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { accessSync, constants, existsSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

function cleanRootOwnedOutput(): Plugin {
  return {
    name: 'clean-root-owned-output',
    buildStart() {
      const outputDir = resolve(import.meta.dirname, '.output')
      if (!existsSync(outputDir)) return
      try {
        accessSync(outputDir, constants.W_OK)
      } catch {
        try {
          rmSync(outputDir, { recursive: true, force: true })
        } catch {
          execSync(`sudo rm -rf ${outputDir}`)
        }
      }
    },
  }
}

const config = defineConfig({
  plugins: [
    cleanRootOwnedOutput(),
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

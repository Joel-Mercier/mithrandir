import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

// Vite plugin that handles tus upload requests via raw Node.js req/res,
// bypassing TanStack Start's routing which double-dispatches handlers.
function tusUploadPlugin(): Plugin {
  let tusServerPromise: Promise<import("@tus/server").Server> | null = null

  return {
    name: 'tus-upload',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/media/upload/tus')) {
          return next()
        }
        try {
          if (!tusServerPromise) {
            tusServerPromise = import('./src/lib/server/upload.ts')
              .then((mod) => mod.getTusServer())
          }
          const tusServer = await tusServerPromise
          await tusServer.handle(req, res)
        } catch (err) {
          console.error('[tus] Error:', err)
          tusServerPromise = null
          if (!res.headersSent) {
            res.statusCode = 500
            res.end('Internal Server Error')
          }
        }
      })
    },
  }
}

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
    tusUploadPlugin(),
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

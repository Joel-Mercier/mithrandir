import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join, resolve } from 'path'
import { spawn, type ChildProcess } from 'child_process'
import { request as httpRequest } from 'http'

const TUSD_DIR = resolve(import.meta.dirname, '.tusd')
const TUSD_BIN = join(TUSD_DIR, 'tusd')
const PID_FILE = join(TUSD_DIR, 'tusd.pid')
const TUSD_PORT = 1080

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function killTusd() {
  try {
    if (existsSync(PID_FILE)) {
      const pid = Number.parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10)
      if (pid && isProcessAlive(pid)) {
        process.kill(pid, 'SIGTERM')
      }
      unlinkSync(PID_FILE)
    }
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Vite plugin that spawns tusd (Go binary) for file uploads and proxies
 * requests to it. The process is managed with a PID file to prevent
 * duplicates during HMR or config reloads.
 */
function tusdPlugin(): Plugin {
  let tusdProcess: ChildProcess | null = null

  return {
    name: 'tusd',
    async configureServer(server) {
      // Proxy tus requests to tusd BEFORE TanStack Start middleware intercepts them.
      // Vite's server.proxy config doesn't work here because TanStack Start
      // catches the request first and returns a 404 HTML page.
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/media/upload/tus')) {
          return next()
        }
        const proxyReq = httpRequest({
          hostname: 'localhost',
          port: TUSD_PORT,
          path: req.url,
          method: req.method,
          headers: req.headers,
          timeout: 0,
        }, (proxyRes) => {
          res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers)
          proxyRes.pipe(res)
        })
        proxyReq.setTimeout(0)
        proxyReq.on('error', (err) => {
          console.error('[tusd] Proxy error:', err.message)
          if (!res.headersSent) {
            res.statusCode = 502
            res.end('tusd unavailable')
          }
        })
        // Disable timeout on the incoming request too (Vite/Node default is 2min)
        req.setTimeout(0)
        req.pipe(proxyReq)
      })

      // Spawn tusd process
      if (!existsSync(TUSD_BIN)) {
        console.log('[tusd] Binary not found, downloading...')
        const dl = Bun.spawnSync(['bun', 'run', join(import.meta.dirname, 'scripts/download-tusd.ts')])
        if (dl.exitCode !== 0) {
          console.error('[tusd] Download failed:', dl.stderr.toString())
          return
        }
      }

      // Check for existing tusd process (prevents duplicates on config reload)
      if (existsSync(PID_FILE)) {
        const pid = Number.parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10)
        if (pid && isProcessAlive(pid)) {
          console.log(`[tusd] Reusing existing process (PID ${pid})`)
          return
        }
        try { unlinkSync(PID_FILE) } catch {}
      }

      const { loadEnvConfig } = await import('@mithrandir/cli/lib/config')
      const { getProjectRoot } = await import('./src/lib/server/utils.ts')
      const projectRoot = getProjectRoot()
      const config = await loadEnvConfig(projectRoot)
      const uploadDir = resolve(config.BASE_DIR, 'data/media/.uploads')

      const { mkdirSync } = await import('fs')
      mkdirSync(uploadDir, { recursive: true })

      tusdProcess = spawn(TUSD_BIN, [
        '-upload-dir', uploadDir,
        '-port', String(TUSD_PORT),
        '-base-path', '/api/media/upload/tus',
        '-hooks-http', 'http://localhost:3000/api/media/upload/hooks',
        '-hooks-http-forward-headers', 'Cookie,Authorization',
        '-hooks-enabled-events', 'pre-create,post-finish',
        '-behind-proxy',
        '-network-timeout', '0s',
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      if (tusdProcess.pid) {
        writeFileSync(PID_FILE, String(tusdProcess.pid))
        console.log(`[tusd] Started (PID ${tusdProcess.pid}) on port ${TUSD_PORT}`)
      }

      tusdProcess.stdout?.on('data', (data: Buffer) => {
        for (const line of data.toString().trimEnd().split('\n')) {
          console.log(`[tusd] ${line}`)
        }
      })
      tusdProcess.stderr?.on('data', (data: Buffer) => {
        for (const line of data.toString().trimEnd().split('\n')) {
          console.error(`[tusd] ${line}`)
        }
      })

      tusdProcess.on('exit', (code) => {
        console.log(`[tusd] Process exited (code ${code})`)
        try { unlinkSync(PID_FILE) } catch {}
        tusdProcess = null
      })

      const cleanup = () => {
        if (tusdProcess && !tusdProcess.killed) {
          tusdProcess.kill('SIGTERM')
          tusdProcess = null
        }
        killTusd()
      }

      server.httpServer?.on('close', cleanup)
      process.on('exit', cleanup)
      process.on('SIGINT', () => { cleanup(); process.exit() })
      process.on('SIGTERM', () => { cleanup(); process.exit() })
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
    tusdPlugin(),
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

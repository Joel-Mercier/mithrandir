import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// CLI server-side deps that should never be bundled
const serverExternal = [/^@mithrandir\/cli/, /^execa/]

const config = defineConfig({
  plugins: [
    devtools(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  preview: {
    port: 3000,
  },
  ssr: {
    external: ["execa", "@mithrandir/cli"],
  },
  build: {
    rollupOptions: {
      external: [/^node:/, ...serverExternal],
    },
  },
  environments: {
    client: {
      build: {
        rollupOptions: {
          external: [/^node:/, ...serverExternal],
        },
      },
    },
  },
})

export default config

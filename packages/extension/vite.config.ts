import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

function resolveLibsodium() {
  const libsodiumPath = resolve(
    __dirname,
    '../../node_modules/libsodium/dist/modules-esm/libsodium.mjs'
  )

  return {
    name: 'resolve-libsodium',
    resolveId(source: string, importer: string | undefined) {
      if (source === './libsodium.mjs' && importer?.includes('libsodium-wrappers')) {
        return libsodiumPath
      }
      return null
    },
  }
}

function copyManifest() {
  return {
    name: 'copy-manifest',
    closeBundle() {
      fs.copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(__dirname, 'dist/manifest.json')
      )
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '../..'), 'VITE_')
  const envDefines = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])
  )

  return {
    plugins: [react(), resolveLibsodium(), copyManifest()],
    resolve: {
      alias: {
        '@jpass/ui': resolve(__dirname, '../ui/src/index.ts'),
        '@jpass/core': resolve(__dirname, '../core/src/index.ts'),
      },
    },
    root: 'src',
    define: envDefines,
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/index.html'),
          background: resolve(__dirname, 'src/background.ts'),
          content: resolve(__dirname, 'src/content.ts')
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
              return '[name].js'
            }
            return 'assets/[name]-[hash].js'
          }
        }
      }
    }
  }
})

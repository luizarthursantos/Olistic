import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const pkg = require('./package.json')

function gitSha(): string {
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'local'
  }
}

/**
 * Rewrites the __BUILD_ID__ placeholder in the copied service worker. Files in
 * public/ bypass the bundler, so this runs against the emitted file on disk.
 * Without it the cache name is a constant and old builds are never evicted.
 */
function stampServiceWorker(buildId: string): Plugin {
  return {
    name: 'olistic-stamp-sw',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js')
      const src = readFileSync(swPath, 'utf8')
      if (!src.includes('__BUILD_ID__')) {
        this.warn('sw.js has no __BUILD_ID__ placeholder — cache will not be versioned')
        return
      }
      writeFileSync(swPath, src.replaceAll('__BUILD_ID__', buildId))
    },
  }
}

const buildId = `${pkg.version}-${gitSha()}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), stampServiceWorker(buildId)],
  base: '/Olistic/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(gitSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})

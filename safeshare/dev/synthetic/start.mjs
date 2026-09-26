import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const server = await createServer({
  root,
  configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
  logLevel: 'warn',
  server: {
    host: '127.0.0.1',
    port: 5199,
    strictPort: true,
    hmr: false,
    watch: null,
  },
  ssr: { external: ['@playwright/test'] },
})

await server.listen()
try {
  const loaded = await server.ssrLoadModule('/dev/synthetic/run.ts')
  await loaded.main('http://127.0.0.1:5199/safeshare/')
} finally {
  await server.close()
}

import { APP_BASE } from './appBase.ts'
import { firstSharedFile, isSharePost, type SharedFile } from './share/target.ts'
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare global {
  interface Window {
    /** Replaced at build time with the precache manifest. App assets only. */
    __WB_MANIFEST: (string | { url: string; revision: string | null })[]
  }
}

type WorkerClient = { postMessage: (data: unknown) => void }

type WorkerEvent = {
  request: Request
  respondWith: (response: Promise<Response>) => void
  source: WorkerClient | null
  data: unknown
}

type WorkerScope = {
  skipWaiting: () => void
  location: { origin: string }
  clients: {
    matchAll: (options: { type: 'window'; includeUncontrolled: boolean }) => Promise<WorkerClient[]>
  }
  addEventListener: (type: 'fetch' | 'message', listener: (event: WorkerEvent) => void) => void
}

const worker = self as unknown as WorkerScope

/** Held in worker memory until the page acknowledges it. Dropped after that. */
let pending: SharedFile | null = null

function postShared(client: WorkerClient) {
  if (!pending) return
  client.postMessage({
    type: 'safeshare-shared',
    file: { name: pending.name, type: pending.type, buffer: pending.buffer },
  })
}

async function receiveShare(request: Request): Promise<Response> {
  try {
    const file = await firstSharedFile(await request.formData())
    pending = file
    if (file) {
      const open = await worker.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of open) postShared(client)
    }
  } catch {
    pending = null
  }
  return Response.redirect(new URL(APP_BASE, worker.location.origin), 303)
}

void worker.skipWaiting()
clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/\/share-target$/],
  }),
)

worker.addEventListener('fetch', (event) => {
  if (!isSharePost(event.request.url, event.request.method)) return
  event.respondWith(receiveShare(event.request))
})

worker.addEventListener('message', (event) => {
  const source = event.source
  if (!source || !('postMessage' in source)) return
  const data = event.data as { type?: string } | null
  if (!data) return
  if (data.type === 'safeshare-ack') {
    pending = null
    return
  }
  if (data.type === 'safeshare-pull') postShared(source)
})

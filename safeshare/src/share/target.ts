import { APP_BASE } from '../appBase.ts'
import { extensionOf, fileKind } from '../load/classify.ts'

/** Same-origin path. The service worker answers this POST and never forwards it. */
export const SHARE_PATH = `${APP_BASE}share-target`

export const SHARE_FIELD = 'file'

export type SharedFile = {
  name: string
  type: string
  buffer: ArrayBuffer
}

export function isSharePost(url: string, method: string): boolean {
  if (method !== 'POST') return false
  try {
    return new URL(url).pathname === SHARE_PATH
  } catch {
    return false
  }
}

function accepted(file: File): boolean {
  const kind = fileKind({ mimeType: file.type, extension: extensionOf(file.name) })
  return kind === 'image' || kind === 'pdf'
}

/** First image or PDF only. Other parts are ignored and not retained. */
export async function firstSharedFile(form: FormData): Promise<SharedFile | null> {
  for (const entry of form.getAll(SHARE_FIELD)) {
    if (!(entry instanceof File) || !accepted(entry)) continue
    const buffer = await entry.arrayBuffer()
    const type =
      entry.type ||
      (fileKind({ mimeType: '', extension: extensionOf(entry.name) }) === 'pdf'
        ? 'application/pdf'
        : '')
    return { name: entry.name || 'shared', type, buffer }
  }
  return null
}

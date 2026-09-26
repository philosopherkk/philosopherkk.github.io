import { exportZipName } from './names.ts'
import { zipStored } from './zip.ts'

export type ShareOutcome = 'shared' | 'dismissed' | 'downloaded' | 'failed'

export type ShareHost = {
  canShare?: (data: { files: File[] }) => boolean
  share?: (data: { files: File[] }) => Promise<void>
}

export function shareDismissed(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: unknown }).name === 'AbortError'
  )
}

/** True only when the platform accepts this exact file list. */
export function canShareFiles(host: ShareHost, files: readonly File[]): boolean {
  if (!host.canShare || !host.share) return false
  try {
    return host.canShare({ files: [...files] }) === true
  } catch {
    return false
  }
}

async function zipFiles(files: readonly File[], token: string): Promise<File> {
  const entries = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    })),
  )
  const zipped = zipStored(entries)
  const buffer = new ArrayBuffer(zipped.byteLength)
  new Uint8Array(buffer).set(zipped)
  return new File([buffer], exportZipName(token), { type: 'application/zip' })
}

/**
 * One share call for every page. Download when sharing is absent.
 * More than one downloaded file is packed into a single zip.
 */
export async function deliverFiles(
  files: readonly File[],
  token: string,
  host: ShareHost,
  save: (blob: Blob, filename: string) => string,
): Promise<{ outcome: ShareOutcome; urls: string[] }> {
  if (files.length === 0) return { outcome: 'failed', urls: [] }
  if (canShareFiles(host, files) && host.share) {
    try {
      await host.share({ files: [...files] })
      return { outcome: 'shared', urls: [] }
    } catch (error) {
      if (shareDismissed(error)) return { outcome: 'dismissed', urls: [] }
      return { outcome: 'failed', urls: [] }
    }
  }
  try {
    const payload = files.length === 1 ? files[0] : await zipFiles(files, token)
    if (!payload) return { outcome: 'failed', urls: [] }
    const url = save(payload, payload instanceof File ? payload.name : exportZipName(token))
    return { outcome: 'downloaded', urls: [url] }
  } catch {
    return { outcome: 'failed', urls: [] }
  }
}

export type LoadErrorCode = 'unsupported' | 'image-decode' | 'pdf-decode' | 'too-many-pages'

export type FileKind = 'image' | 'pdf' | 'unsupported'

export type SelectedFile = {
  mimeType: string
  /** Lowercase extension without the dot. Empty when there is none. */
  extension: string
}

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'heic',
  'heif',
  'tif',
  'tiff',
])

export function extensionOf(filename: string): string {
  const slash = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'))
  const base = slash >= 0 ? filename.slice(slash + 1) : filename
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) return ''
  return base.slice(dot + 1).toLowerCase()
}

function mimeOf(mimeType: string): string {
  return mimeType.toLowerCase().split(';', 1)[0]?.trim() ?? ''
}

export function fileKind(input: SelectedFile): FileKind {
  const mime = mimeOf(input.mimeType)
  const extension = input.extension.toLowerCase()
  if (mime === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (mime === 'image/svg+xml') return 'unsupported'
  if (mime.startsWith('image/')) return 'image'
  if ((mime === '' || mime === 'application/octet-stream') && IMAGE_EXTENSIONS.has(extension)) {
    return 'image'
  }
  return 'unsupported'
}

/** Fixed copy. Never include a file name, bytes, or document text. */
export function loadErrorMessage(code: LoadErrorCode): string {
  switch (code) {
    case 'unsupported':
      return 'This file type is not supported. Choose a JPEG, PNG, or PDF.'
    case 'image-decode':
      return 'The photo could not be read. Choose a JPEG or PNG.'
    case 'pdf-decode':
      return 'This PDF could not be read. Choose another file.'
    case 'too-many-pages':
      return 'This PDF has more than 10 pages. Choose a shorter document.'
  }
}

export class LoadFailure extends Error {
  readonly code: LoadErrorCode

  constructor(code: LoadErrorCode) {
    super(loadErrorMessage(code))
    this.name = 'LoadFailure'
    this.code = code
  }
}

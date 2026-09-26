/** SPEC §8. Settings only — never images, OCR text, or detections. */
export const SETTINGS_STORAGE_KEY = 'safeshare-md-settings'

export type Settings = {
  defaultMode: 'standard' | 'header-blackout' | 'results-only' | 'manual'
  redactDoctorNames: boolean
  redactOrganisationNames: boolean
  redactAllDates: boolean
  redactAge: boolean
  redactSex: boolean
  redactLowConfidenceHeaderWords: boolean
  watermark: boolean
  outputFormat: 'jpeg' | 'png'
}

export const DEFAULT_SETTINGS: Settings = {
  defaultMode: 'standard',
  redactDoctorNames: true,
  redactOrganisationNames: false,
  redactAllDates: false,
  redactAge: false,
  redactSex: false,
  redactLowConfidenceHeaderWords: true,
  watermark: true,
  outputFormat: 'jpeg',
}

const MODES = new Set<Settings['defaultMode']>([
  'standard',
  'header-blackout',
  'results-only',
  'manual',
])

function booleanSetting(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/** Drops anything that is not a settings field, including images and text. */
export function sanitizeSettings(input: unknown): Settings {
  const source =
    input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const mode = source.defaultMode
  const output = source.outputFormat
  return {
    defaultMode:
      typeof mode === 'string' && MODES.has(mode as Settings['defaultMode'])
        ? (mode as Settings['defaultMode'])
        : DEFAULT_SETTINGS.defaultMode,
    redactDoctorNames: booleanSetting(source.redactDoctorNames, DEFAULT_SETTINGS.redactDoctorNames),
    redactOrganisationNames: booleanSetting(
      source.redactOrganisationNames,
      DEFAULT_SETTINGS.redactOrganisationNames,
    ),
    redactAllDates: booleanSetting(source.redactAllDates, DEFAULT_SETTINGS.redactAllDates),
    redactAge: booleanSetting(source.redactAge, DEFAULT_SETTINGS.redactAge),
    redactSex: booleanSetting(source.redactSex, DEFAULT_SETTINGS.redactSex),
    redactLowConfidenceHeaderWords: booleanSetting(
      source.redactLowConfidenceHeaderWords,
      DEFAULT_SETTINGS.redactLowConfidenceHeaderWords,
    ),
    watermark: booleanSetting(source.watermark, DEFAULT_SETTINGS.watermark),
    outputFormat: output === 'jpeg' || output === 'png' ? output : DEFAULT_SETTINGS.outputFormat,
  }
}

export function saveSettings(
  settings: Settings,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitizeSettings(settings)))
}

export function loadSettings(storage: Pick<Storage, 'getItem'> = localStorage): Settings {
  const raw = storage.getItem(SETTINGS_STORAGE_KEY)
  if (!raw) return { ...DEFAULT_SETTINGS }
  try {
    return sanitizeSettings(JSON.parse(raw) as unknown)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

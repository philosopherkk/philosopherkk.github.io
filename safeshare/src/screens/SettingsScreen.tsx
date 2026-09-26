import type { Settings } from '../settings.ts'

type FlagKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never
}[keyof Settings]

const MODES: readonly { id: Settings['defaultMode']; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'header-blackout', label: 'Header blackout' },
  { id: 'results-only', label: 'Results only' },
  { id: 'manual', label: 'Manual' },
]

const TOGGLES: readonly { key: FlagKey; label: string }[] = [
  { key: 'redactDoctorNames', label: 'Redact doctor names' },
  { key: 'redactOrganisationNames', label: 'Redact organisation names' },
  { key: 'redactAllDates', label: 'Redact all dates' },
  { key: 'redactAge', label: 'Redact age' },
  { key: 'redactSex', label: 'Redact sex' },
  { key: 'redactLowConfidenceHeaderWords', label: 'Redact low-confidence header words' },
  { key: 'watermark', label: 'Watermark' },
]

type SettingsScreenProps = {
  settings: Settings
  onChange: (next: Settings) => void
}

export function SettingsScreen({ settings, onChange }: SettingsScreenProps) {
  function toggle(key: FlagKey, checked: boolean) {
    onChange({ ...settings, [key]: checked })
  }

  return (
    <section className="stack screen-scroll" aria-labelledby="settings-title">
      <h2 id="settings-title">Settings</h2>
      <p>These choices stay on this phone. Photos and report text are not saved.</p>
      <div className="modes" role="group" aria-label="Default mode">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={settings.defaultMode === item.id}
            onClick={() => {
              onChange({ ...settings, defaultMode: item.id })
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {TOGGLES.map((item) => (
        <label className="check" key={item.key}>
          <input
            type="checkbox"
            checked={settings[item.key] === true}
            onChange={(event) => {
              toggle(item.key, event.target.checked)
            }}
          />
          <span>{item.label}</span>
        </label>
      ))}
      <div className="output" role="group" aria-label="Output format">
        <button
          type="button"
          aria-pressed={settings.outputFormat === 'jpeg'}
          onClick={() => {
            onChange({ ...settings, outputFormat: 'jpeg' })
          }}
        >
          JPEG
        </button>
        <button
          type="button"
          aria-pressed={settings.outputFormat === 'png'}
          onClick={() => {
            onChange({ ...settings, outputFormat: 'png' })
          }}
        >
          PNG
        </button>
      </div>
    </section>
  )
}

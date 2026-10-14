import { APP_UPDATED, APP_VERSION, HISTORY_URL } from '../version.ts'

export function VersionStamp() {
  return (
    <div className="version-stamp">
      <p>
        SafeShare MD {APP_VERSION} · updated {APP_UPDATED} HKT
      </p>
      <a href={HISTORY_URL} target="_blank" rel="noopener noreferrer">
        History
      </a>
    </div>
  )
}

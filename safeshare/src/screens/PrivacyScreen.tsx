import { AIRPLANE_MODE_CHECK, CORE_PROMISE } from '../copy.ts'

export function PrivacyScreen() {
  return (
    <section className="stack">
      <h2>Privacy</h2>
      <p>{CORE_PROMISE}</p>
      <p>{AIRPLANE_MODE_CHECK}</p>
    </section>
  )
}

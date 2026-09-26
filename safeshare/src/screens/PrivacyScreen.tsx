import {
  AIRPLANE_MODE_CHECK,
  CORE_PROMISE,
  PRIVACY_NOT_SAVED,
  PRIVACY_ON_DEVICE,
  PRIVACY_VERIFY,
} from '../copy.ts'

export function PrivacyScreen() {
  return (
    <section className="stack screen-scroll" aria-labelledby="privacy-title">
      <h2 id="privacy-title">Privacy</h2>
      <p>{CORE_PROMISE}</p>
      <p>{PRIVACY_ON_DEVICE}</p>
      <p>{PRIVACY_NOT_SAVED}</p>
      <p>{AIRPLANE_MODE_CHECK}</p>
      <p>{PRIVACY_VERIFY}</p>
    </section>
  )
}

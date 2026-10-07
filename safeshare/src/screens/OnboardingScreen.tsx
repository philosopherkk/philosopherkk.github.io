import { useEffect, useRef, useState } from 'react'
import {
  DISCLAIMER_ADVICE,
  DISCLAIMER_CHECK,
  DISCLAIMER_DETECTION,
  ONBOARDING_STEPS,
} from '../copy.ts'

type OnboardingScreenProps = {
  onAccept: () => void
}

export function OnboardingScreen({ onAccept }: OnboardingScreenProps) {
  const [step, setStep] = useState(0)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const current = ONBOARDING_STEPS[step] ?? ONBOARDING_STEPS[0]
  const last = step === ONBOARDING_STEPS.length - 1

  useEffect(() => {
    titleRef.current?.focus()
  }, [step])

  return (
    <section className="onboard" aria-labelledby="onboard-title">
      <div className="onboard-copy">
        <h2 id="onboard-title" tabIndex={-1} ref={titleRef}>
          <span className="step">{`Step ${step + 1} of ${ONBOARDING_STEPS.length}`}</span>
          {current.title}
        </h2>
        {last ? (
          <>
            <p>{DISCLAIMER_DETECTION}</p>
            <p>{DISCLAIMER_CHECK}</p>
            <p>{DISCLAIMER_ADVICE}</p>
          </>
        ) : (
          <p>{current.body}</p>
        )}
      </div>
      <div className="onboard-actions">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => {
              setStep((value) => value - 1)
            }}
          >
            Back
          </button>
        ) : null}
        {last ? (
          <button type="button" className="primary" onClick={onAccept}>
            I understand
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            onClick={() => {
              setStep((value) => value + 1)
            }}
          >
            Next
          </button>
        )}
      </div>
    </section>
  )
}

export const CORE_PROMISE =
  'Nothing leaves your phone except the redacted image you choose to share.'

export const AIRPLANE_MODE_CHECK =
  'Airplane-mode check: load the app once while you have a connection, then turn on airplane mode. You should still be able to redact a report and share the image. The document is not sent to a server. If the app tries to reach the network for your photo or the words it read, stop and do not share.'

export const DISCLAIMER_DETECTION = 'Automatic detection is not perfect.'

export const DISCLAIMER_CHECK = 'You are responsible for checking the image before sharing.'

export const DISCLAIMER_ADVICE = 'This app does not give medical advice.'

export const PRIVACY_ON_DEVICE =
  'The photo is read on this phone. Finding identifiers and covering them in black also happen on this phone. Nothing is uploaded.'

export const PRIVACY_NOT_SAVED =
  'There is no account. The report and the black boxes stay in memory only and are not sent anywhere.'

export const PRIVACY_VERIFY =
  'To verify: load SafeShare once while you are online. Then turn the network off and run a report. If redaction still finishes, the work stayed on this phone.'

export const ONBOARDING_STEPS = [
  {
    title: 'On this phone',
    body: 'Photograph a lab report or choose a PDF. SafeShare blacks out patient identifiers on this phone, then you share only the redacted image.',
  },
  {
    title: 'Nothing is uploaded',
    body: 'Reading and redaction happen on this phone. The report is not sent to a server. Load the app once online, then turn the network off, and you can still finish a report.',
  },
  {
    title: 'Before you start',
    body: `${DISCLAIMER_DETECTION} ${DISCLAIMER_CHECK} ${DISCLAIMER_ADVICE}`,
  },
] as const

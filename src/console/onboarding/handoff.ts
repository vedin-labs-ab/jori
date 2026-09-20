// Creating an organization activates it, which starts the session's
// connection over and remounts the console from its gates down. Those gates
// hold a loader until the new organization is known. During onboarding that
// loader is the step the person just submitted, so the screen they are
// looking at never changes: this is where the step waits out the remount,
// outside the tree that is being rebuilt.

export type OnboardingHandoff = {
  /** Whether the person has no other organization, and so no sidebar. */
  alone: boolean
  /** What they named the organization. */
  name: string
}

let pending: OnboardingHandoff | undefined

export function beginHandoff(handoff: OnboardingHandoff) {
  pending = handoff
}

export function endHandoff() {
  pending = undefined
}

export function readHandoff() {
  return pending
}

import { lazy } from "react"

type Onboarding = typeof import("./index").Onboarding

let arrived: Onboarding | undefined

/** Onboarding is its own download: an organization goes through it once,
 *  and every console load after that would otherwise carry it. Whatever can
 *  lead into it calls this ahead of time, so it is there by the time it is
 *  asked for. */
export async function loadOnboarding() {
  arrived = (await import("./index")).Onboarding

  return arrived
}

const Awaited = lazy(async () => ({ default: await loadOnboarding() }))

/** Onboarding as a component: the one that has arrived, or one that waits
 *  for it. A lazy component suspends the first time it is drawn even when
 *  its download is done, and React keeps the fallback up for a moment once
 *  it shows, so what has arrived is drawn as itself and the console gives
 *  way to it in one frame. Read it once per mount: the two are different
 *  components, and swapping them would start the flow over. */
export const onboardingComponent = () => arrived ?? Awaited

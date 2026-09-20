/** Onboarding's steps, in order: the organization's name, its logo and
 *  timezone, its website, Jori reading it, what Jori drafted from it, then
 *  the way into the console. */
export const onboardingSteps = [
  "name",
  "details",
  "website",
  "working",
  "profile",
  "done",
] as const

export type OnboardingStepName = (typeof onboardingSteps)[number]

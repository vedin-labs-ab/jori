import { collapseWhitespace } from "./text"

/** Team-size bands. The middle three are the initial ICP; the outer two exist
 *  so people outside it can say so, which is signal worth collecting. */
export const teamSizes = ["1-9", "10-24", "25-49", "50-99", "100+"] as const

export type TeamSize = (typeof teamSizes)[number]

export const teamSizeLabels = {
  "1-9": "1 to 9 people",
  "10-24": "10 to 24 people",
  "25-49": "25 to 49 people",
  "50-99": "50 to 99 people",
  "100+": "100 or more people",
} satisfies Record<TeamSize, string>

/** Field caps, shared by the form's maxLength and the mutation's validation
 *  so the browser and the server agree on what is too long. */
export const waitlistLimits = { email: 254, work: 600 } as const

export type WaitlistEntry = {
  email: string
  size: TeamSize
  work: string
}

export function isTeamSize(value: string): value is TeamSize {
  return teamSizes.some((size) => size === value)
}

/** One deliberately loose address check: a single @, something either side,
 *  a dot in the domain, no whitespace. Anything stricter rejects valid
 *  addresses, and delivery is the real test. */
export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase()

  if (email.length > waitlistLimits.email) {
    return undefined
  }

  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(email) ? email : undefined
}

export function normalizeWork(value: string) {
  return collapseWhitespace(value).slice(0, waitlistLimits.work)
}

/** The single validation path. Returns the row to store, or the reason it
 *  cannot be stored, so the form and the mutation never disagree. */
export function readWaitlistEntry(input: {
  email: string
  size: string
  work: string
}): { entry: WaitlistEntry } | { error: string } {
  const email = normalizeEmail(input.email)

  if (email === undefined) {
    return { error: "Enter a valid email address." }
  }

  if (!isTeamSize(input.size)) {
    return { error: "Choose a team size." }
  }

  const work = normalizeWork(input.work)

  if (work === "") {
    return { error: "Tell us one thing your team does by hand." }
  }

  return { entry: { email, size: input.size, work } }
}

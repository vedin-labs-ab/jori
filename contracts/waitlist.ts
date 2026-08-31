import { collapseWhitespace } from "./text"

/** Team-size bands. The middle three are the initial ICP; the outer two exist
 *  so people outside it can say so, which is signal worth collecting. */
export const teamSizes = ["1-9", "10-24", "25-49", "50-99", "100+"] as const

type TeamSize = (typeof teamSizes)[number]

export const teamSizeLabels = {
  "1-9": "1 to 9 people",
  "10-24": "10 to 24 people",
  "25-49": "25 to 49 people",
  "50-99": "50 to 99 people",
  "100+": "100 or more people",
} satisfies Record<TeamSize, string>

/** Field caps, shared by the form's maxLength and the server's validation so
 *  the browser and the server agree on what is too long. */
export const waitlistLimits = { email: 254, work: 600 } as const

export type WaitlistField = "email" | "size" | "work"

type WaitlistEntry = {
  email: string
  size: TeamSize
  work: string
}

/** A rejection names the field it belongs to, so the form can mark that one
 *  input invalid rather than printing a notice under the whole form. */
type WaitlistRejection = { field: WaitlistField; message: string }

function isTeamSize(value: string): value is TeamSize {
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

function normalizeWork(value: string) {
  return collapseWhitespace(value).slice(0, waitlistLimits.work)
}

/** The single validation path. Returns the row to store, or the field that
 *  stopped it, so the form and the server never disagree. */
export function readWaitlistEntry(input: {
  email: string
  size: string
  work: string
}): { entry: WaitlistEntry } | { rejection: WaitlistRejection } {
  const email = normalizeEmail(input.email)

  if (email === undefined) {
    return {
      rejection: { field: "email", message: "Enter a valid email address." },
    }
  }

  if (!isTeamSize(input.size)) {
    return { rejection: { field: "size", message: "Choose a team size." } }
  }

  const work = normalizeWork(input.work)

  if (work === "") {
    return {
      rejection: {
        field: "work",
        message: "Tell us one thing your team does by hand.",
      },
    }
  }

  return { entry: { email, size: input.size, work } }
}

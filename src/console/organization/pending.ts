const storageKey = "jori.pending-timezone"

/**
 * The timezone chosen while creating an organization, held across the one
 * reload that follows it.
 *
 * Declaring the zone is scoped to the organization claim in the Convex
 * token, and that claim is minted per page load — so the mutation cannot
 * run until the console comes back up inside the new organization. The
 * choice waits here in the meantime, and is spent the first time it is
 * read.
 */
export function rememberTimezone(organizationId: string, timezone: string) {
  write(JSON.stringify({ organizationId, timezone }))
}

export function takeTimezone(organizationId: string) {
  const stored = read()

  if (stored === null) {
    return null
  }

  write(null)

  const pending = parse(stored)

  return isPending(pending) && pending.organizationId === organizationId
    ? pending.timezone
    : null
}

function parse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

type PendingTimezone = { organizationId: string; timezone: string }

function isPending(value: unknown): value is PendingTimezone {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const pending = value as Partial<PendingTimezone>

  return (
    typeof pending.organizationId === "string" &&
    typeof pending.timezone === "string"
  )
}

// Session storage is unavailable to a browser told to keep no site data.
// Losing the choice there costs a correction in settings, not the flow.
function read() {
  try {
    return window.sessionStorage.getItem(storageKey)
  } catch {
    return null
  }
}

function write(value: string | null) {
  try {
    if (value === null) {
      window.sessionStorage.removeItem(storageKey)
    } else {
      window.sessionStorage.setItem(storageKey, value)
    }
  } catch {
    return
  }
}

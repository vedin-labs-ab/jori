// Every share link is an independent grant with its own expiry. The bounds
// keep links short-lived by default while allowing up to a week.

export const shareExpiry = {
  minHours: 1,
  defaultHours: 72,
  maxHours: 168,
} as const

export function shareExpiresAt(now: number, expiresInHours?: number) {
  return now + clampShareExpiryHours(expiresInHours) * 60 * 60 * 1000
}

export function clampShareExpiryHours(hours: number | undefined) {
  if (hours === undefined || Number.isNaN(hours)) {
    return shareExpiry.defaultHours
  }

  return Math.min(shareExpiry.maxHours, Math.max(shareExpiry.minHours, hours))
}

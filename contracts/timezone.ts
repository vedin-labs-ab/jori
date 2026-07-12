export const utcTimezone = "UTC"

export function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function requireTimezone(value: string) {
  if (!isValidTimezone(value)) {
    throw new Error(`Invalid IANA timezone: ${value}`)
  }

  return value
}

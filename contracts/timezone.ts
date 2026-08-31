export const utcTimezone = "UTC"

/** Every IANA zone this runtime knows, already sorted by the platform. The
 *  only list a picker should offer. */
export function supportedTimezones() {
  return Intl.supportedValuesOf("timeZone")
}

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

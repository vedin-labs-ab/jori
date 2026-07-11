const utcWeekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

const utcMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

export function createPromptTime(now = new Date()) {
  const weekday = utcWeekdays[now.getUTCDay()]
  const timestamp = now.toISOString().replace(/\.\d{3}Z$/, "Z")

  return `${weekday}, ${timestamp}`
}

/** The same instant in an IANA zone, with the zone and offset spelled out —
 *  "Friday, 2026-07-11 21:16 Europe/Stockholm (GMT+2)". Null when the zone
 *  is unknown to the runtime. */
export function createLocalPromptTime(timeZone: string, now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZoneName: "shortOffset",
    }).formatToParts(now)
    const value = Object.fromEntries(
      parts.map((part) => [part.type, part.value])
    )

    return `${value.weekday}, ${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute} ${timeZone} (${value.timeZoneName})`
  } catch {
    return null
  }
}

// The one relative-age vocabulary for prompt copy ("2 days ago"), shared by
// every context message so ages always read the same to the model.
export function formatAge(ageMs: number) {
  const minutes = Math.floor(ageMs / 60_000)

  if (minutes < 1) {
    return "just now"
  }

  if (minutes < 60) {
    return unit(minutes, "minute")
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return unit(hours, "hour")
  }

  const days = Math.floor(hours / 24)

  if (days < 7) {
    return unit(days, "day")
  }

  if (days < 35) {
    return unit(Math.floor(days / 7), "week")
  }

  if (days < 365) {
    return unit(Math.floor(days / 30), "month")
  }

  return unit(Math.floor(days / 365), "year")
}

export function formatMonth(timestamp: number) {
  const date = new Date(timestamp)

  return `${utcMonths[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

function unit(value: number, label: string) {
  return value === 1 ? `1 ${label} ago` : `${value} ${label}s ago`
}

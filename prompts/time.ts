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

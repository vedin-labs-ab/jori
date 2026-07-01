const utcWeekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

export function createPromptTime(now = new Date()) {
  const weekday = utcWeekdays[now.getUTCDay()]
  const timestamp = now.toISOString().replace(/\.\d{3}Z$/, "Z")

  return `${weekday}, ${timestamp}`
}

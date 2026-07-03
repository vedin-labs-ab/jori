import { classifyCron } from "./classify"

const weekdayLabels: Record<string, string> = {
  "0": "Sunday",
  "1": "Monday",
  "2": "Tuesday",
  "3": "Wednesday",
  "4": "Thursday",
  "5": "Friday",
  "6": "Saturday",
}

export function describeCron(expression: string | undefined) {
  const cron = classifyCron(expression)

  if (cron === null) {
    return null
  }

  const time = `${cron.time} UTC`

  if (cron.repeat === "daily") {
    return `Daily at ${time}`
  }

  if (cron.repeat === "weekdays") {
    return `Weekdays at ${time}`
  }

  if (cron.repeat === "weekly") {
    const weekday =
      cron.dayOfWeek === undefined ? undefined : weekdayLabels[cron.dayOfWeek]

    return weekday === undefined ? null : `${weekday}s at ${time}`
  }

  return cron.dayOfMonth === undefined
    ? null
    : `Monthly on the ${ordinal(Number(cron.dayOfMonth))} at ${time}`
}

export function ordinal(value: number) {
  const remainder = value % 10
  const suffix =
    value >= 11 && value <= 13
      ? "th"
      : remainder === 1
        ? "st"
        : remainder === 2
          ? "nd"
          : remainder === 3
            ? "rd"
            : "th"

  return `${value}${suffix}`
}

type DescribedCron = {
  dayOfMonth?: string
  dayOfWeek?: string
  repeat: "daily" | "monthly" | "weekdays" | "weekly"
  time: string
}

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
  const cron = classifyDescribableCron(expression)

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

function classifyDescribableCron(
  expression: string | undefined
): DescribedCron | null {
  const trimmed = expression?.trim() ?? ""

  if (trimmed === "") {
    return null
  }

  const fields = trimmed.split(/\s+/)

  if (fields.length !== 5) {
    return null
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields
  const time = readCronTime(minute, hour)

  if (time === null || month !== "*") {
    return null
  }

  if (dayOfMonth === "*" && dayOfWeek === "*") {
    return { repeat: "daily", time }
  }

  if (dayOfMonth === "*" && dayOfWeek === "1-5") {
    return { repeat: "weekdays", time }
  }

  const weeklyDay = readWeekday(dayOfWeek)

  if (dayOfMonth === "*" && weeklyDay !== null) {
    return { dayOfWeek: weeklyDay, repeat: "weekly", time }
  }

  if (dayOfWeek === "*" && isMonthDay(dayOfMonth)) {
    return { dayOfMonth, repeat: "monthly", time }
  }

  return null
}

function readCronTime(minute: string, hour: string) {
  if (!(isSmallInteger(minute) && isSmallInteger(hour))) {
    return null
  }

  const minuteValue = Number(minute)
  const hourValue = Number(hour)

  if (minuteValue > 59 || hourValue > 23) {
    return null
  }

  return `${pad(hourValue)}:${pad(minuteValue)}`
}

function readWeekday(dayOfWeek: string) {
  if (!isSmallInteger(dayOfWeek) || Number(dayOfWeek) > 7) {
    return null
  }

  return dayOfWeek === "7" ? "0" : dayOfWeek
}

function isMonthDay(dayOfMonth: string) {
  if (!isSmallInteger(dayOfMonth)) {
    return false
  }

  const value = Number(dayOfMonth)

  return value >= 1 && value <= 31
}

function isSmallInteger(value: string) {
  return /^\d{1,2}$/.test(value)
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function ordinal(value: number) {
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

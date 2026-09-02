type ClassifiedCron = {
  dayOfMonth?: string
  dayOfWeek?: string
  repeat: "daily" | "monthly" | "weekdays" | "weekly"
  time: string
}

export function classifyCron(
  expression: string | undefined
): ClassifiedCron | null {
  const trimmed = expression?.trim() ?? ""

  if (trimmed === "") {
    return null
  }

  const fields = trimmed.split(/\s+/)

  if (fields.length !== 5) {
    return null
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields
  const time = readTime(minute, hour)

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

function readTime(minute: string, hour: string) {
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

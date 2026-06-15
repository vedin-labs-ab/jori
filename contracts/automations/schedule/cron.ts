const cronFieldRanges = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 7 },
] as const

type CronSchedule = {
  minutes: number[]
  hours: number[]
  daysOfMonth: Set<number>
  months: Set<number>
  daysOfWeek: Set<number>
  unrestrictedDayOfMonth: boolean
  unrestrictedDayOfWeek: boolean
}

export function validateCronExpression(expression: string) {
  parseCronExpression(expression)
}

export function getNextCronRunAt(expression: string, from: number) {
  const schedule = parseCronExpression(expression)
  const start = getNextMinute(from)
  const cursor = getStartOfUtcDay(start)

  const maxSearchDays = 5 * 366

  for (let day = 0; day < maxSearchDays; day += 1) {
    if (matchesCalendar(schedule, cursor)) {
      const runAt = getNextTimeOnDay(schedule, cursor, start)

      if (runAt !== null) {
        return runAt
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  throw new Error(
    "This cron expression has no upcoming runs in the next five years."
  )
}

function parseCronExpression(expression: string): CronSchedule {
  const fields = expression.trim().split(/\s+/)

  if (fields.length !== 5) {
    throw new Error(
      "Cron expressions need five fields: minute, hour, day of month, month, day of week."
    )
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields
  const daysOfWeek = parseCronField(dayOfWeek, 4)
  const normalizedDaysOfWeek = new Set(
    [...daysOfWeek].map((value) => (value === 7 ? 0 : value))
  )

  const schedule = {
    minutes: parseCronValues(minute, 0),
    hours: parseCronValues(hour, 1),
    daysOfMonth: parseCronField(dayOfMonth, 2),
    months: parseCronField(month, 3),
    daysOfWeek: normalizedDaysOfWeek,
    unrestrictedDayOfMonth: dayOfMonth === "*",
    unrestrictedDayOfWeek: dayOfWeek === "*",
  }

  validateCalendarSatisfiable(schedule)

  return schedule
}

function parseCronValues(field: string, fieldIndex: number) {
  return [...parseCronField(field, fieldIndex)].sort(
    (left, right) => left - right
  )
}

function parseCronField(field: string, fieldIndex: number) {
  if (field === "") {
    throw new Error("Cron fields cannot be empty")
  }

  const values = new Set<number>()

  for (const part of field.split(",")) {
    if (part === "") {
      throw new Error("Cron fields cannot contain empty parts")
    }

    addCronPart(values, part, fieldIndex)
  }

  return values
}

function addCronPart(values: Set<number>, part: string, fieldIndex: number) {
  const [range, stepValue] = part.split("/")
  const step = stepValue === undefined ? 1 : Number(stepValue)

  if (!Number.isInteger(step) || step < 1) {
    throw new Error(`Invalid cron step: ${part}`)
  }

  const bounds = parseCronRange(range, fieldIndex)

  for (let value = bounds.start; value <= bounds.end; value += step) {
    values.add(value)
  }
}

function parseCronRange(range: string, fieldIndex: number) {
  const allowed = cronFieldRanges[fieldIndex]

  if (range === "*") {
    return { start: allowed.min, end: allowed.max }
  }

  const [startValue, endValue] = range.split("-")
  const start = Number(startValue)
  const end = endValue === undefined ? start : Number(endValue)

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < allowed.min ||
    end > allowed.max ||
    start > end
  ) {
    throw new Error(`Invalid cron range: ${range}`)
  }

  return { start, end }
}

function matchesCalendar(schedule: CronSchedule, date: Date) {
  if (!schedule.months.has(date.getUTCMonth() + 1)) {
    return false
  }

  const dayOfMonthMatches = schedule.daysOfMonth.has(date.getUTCDate())
  const dayOfWeekMatches = schedule.daysOfWeek.has(date.getUTCDay())

  if (schedule.unrestrictedDayOfMonth) {
    return dayOfWeekMatches
  }

  if (schedule.unrestrictedDayOfWeek) {
    return dayOfMonthMatches
  }

  return dayOfMonthMatches || dayOfWeekMatches
}

function validateCalendarSatisfiable(schedule: CronSchedule) {
  if (!schedule.unrestrictedDayOfWeek) {
    return
  }

  for (const month of schedule.months) {
    const maxDay = getMaxPossibleDayOfMonth(month)

    for (const dayOfMonth of schedule.daysOfMonth) {
      if (dayOfMonth <= maxDay) {
        return
      }
    }
  }

  throw new Error("This day of month never occurs in the selected months.")
}

function getMaxPossibleDayOfMonth(month: number) {
  if (month === 2) {
    return 29
  }

  if ([4, 6, 9, 11].includes(month)) {
    return 30
  }

  return 31
}

function getNextMinute(from: number) {
  const date = new Date(from)
  date.setUTCSeconds(0, 0)
  date.setUTCMinutes(date.getUTCMinutes() + 1)
  return date
}

function getStartOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

function getNextTimeOnDay(schedule: CronSchedule, day: Date, start: Date) {
  const isStartDay =
    day.getUTCFullYear() === start.getUTCFullYear() &&
    day.getUTCMonth() === start.getUTCMonth() &&
    day.getUTCDate() === start.getUTCDate()
  const startHour = start.getUTCHours()
  const startMinute = start.getUTCMinutes()

  for (const hour of schedule.hours) {
    if (isStartDay && hour < startHour) {
      continue
    }

    for (const minute of schedule.minutes) {
      if (isStartDay && hour === startHour && minute < startMinute) {
        continue
      }

      return Date.UTC(
        day.getUTCFullYear(),
        day.getUTCMonth(),
        day.getUTCDate(),
        hour,
        minute
      )
    }
  }

  return null
}

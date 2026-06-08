const cronFieldRanges = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 7 },
] as const

type CronSchedule = {
  minutes: Set<number>
  hours: Set<number>
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
  const cursor = new Date(from)
  cursor.setUTCSeconds(0, 0)
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1)

  const maxAttempts = 5 * 366 * 24 * 60

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (matchesSchedule(schedule, cursor)) {
      return cursor.getTime()
    }

    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1)
  }

  throw new Error("Cron expression has no matching run in the next five years")
}

function parseCronExpression(expression: string): CronSchedule {
  const fields = expression.trim().split(/\s+/)

  if (fields.length !== 5) {
    throw new Error("Cron expressions must contain five UTC fields")
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields
  const daysOfWeek = parseCronField(dayOfWeek, 4)
  const normalizedDaysOfWeek = new Set(
    [...daysOfWeek].map((value) => (value === 7 ? 0 : value))
  )

  return {
    minutes: parseCronField(minute, 0),
    hours: parseCronField(hour, 1),
    daysOfMonth: parseCronField(dayOfMonth, 2),
    months: parseCronField(month, 3),
    daysOfWeek: normalizedDaysOfWeek,
    unrestrictedDayOfMonth: dayOfMonth === "*",
    unrestrictedDayOfWeek: dayOfWeek === "*",
  }
}

function parseCronField(field: string, fieldIndex: number) {
  if (field === "") {
    throw new Error("Cron fields cannot be empty")
  }

  const values = new Set<number>()

  for (const part of field.split(",")) {
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

function matchesSchedule(schedule: CronSchedule, date: Date) {
  if (!schedule.months.has(date.getUTCMonth() + 1)) {
    return false
  }

  if (!schedule.hours.has(date.getUTCHours())) {
    return false
  }

  if (!schedule.minutes.has(date.getUTCMinutes())) {
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

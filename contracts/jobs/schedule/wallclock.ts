type LocalDateTime = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export type WallClock = {
  formatter: Intl.DateTimeFormat
}

export function createWallClock(timezone: string): WallClock {
  return {
    formatter: new Intl.DateTimeFormat("en-CA-u-ca-gregory-nu-latn", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }),
  }
}

export function getLocalCalendarDay(clock: WallClock, timestamp: number) {
  const local = getLocalDateTime(clock, timestamp)
  return new Date(Date.UTC(local.year, local.month - 1, local.day, 12))
}

/** Resolves a local minute through the runtime's standard timezone data.
 * The first occurrence wins when clocks repeat; nonexistent minutes return null. */
export function resolveLocalMinute(
  clock: WallClock,
  day: Date,
  hour: number,
  minute: number
) {
  const target = {
    year: day.getUTCFullYear(),
    month: day.getUTCMonth() + 1,
    day: day.getUTCDate(),
    hour,
    minute,
  }
  const wallClock = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute
  )
  const sampleDistance = 36 * 60 * 60 * 1000
  const offsets = new Set(
    [wallClock - sampleDistance, wallClock, wallClock + sampleDistance].map(
      (timestamp) => getTimezoneOffset(clock, timestamp)
    )
  )
  const candidates = [...offsets]
    .map((offset) => wallClock - offset)
    .sort((left, right) => left - right)

  return (
    candidates.find((timestamp) =>
      matchesLocalDateTime(getLocalDateTime(clock, timestamp), target)
    ) ?? null
  )
}

function getLocalDateTime(clock: WallClock, timestamp: number): LocalDateTime {
  const values = new Map(
    clock.formatter
      .formatToParts(timestamp)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  )

  return {
    year: requireDatePart(values, "year"),
    month: requireDatePart(values, "month"),
    day: requireDatePart(values, "day"),
    hour: requireDatePart(values, "hour"),
    minute: requireDatePart(values, "minute"),
  }
}

function requireDatePart(values: Map<string, number>, part: string) {
  const value = values.get(part)

  if (value === undefined || !Number.isInteger(value)) {
    throw new Error(`Timezone formatter did not return a valid ${part}.`)
  }

  return value
}

function getTimezoneOffset(clock: WallClock, timestamp: number) {
  const local = getLocalDateTime(clock, timestamp)
  const minuteTimestamp = Math.floor(timestamp / (60 * 1000)) * 60 * 1000

  return (
    Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute) -
    minuteTimestamp
  )
}

function matchesLocalDateTime(left: LocalDateTime, right: LocalDateTime) {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  )
}

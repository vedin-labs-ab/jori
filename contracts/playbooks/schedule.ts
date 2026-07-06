export type PlaybookSchedule =
  | { repeat: "daily"; time: string }
  | { repeat: "weekdays"; time: string }
  | { repeat: "weekly"; weekday: number; time: string }

const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

const minutesPerDay = 24 * 60

export function describePlaybookSchedule(schedule: PlaybookSchedule) {
  if (schedule.repeat === "daily") {
    return `Daily at ${schedule.time}`
  }

  if (schedule.repeat === "weekdays") {
    return `Weekdays at ${schedule.time}`
  }

  return `${weekdayNames[schedule.weekday]}s at ${schedule.time}`
}

/**
 * Automation cron expressions run in UTC, while playbook schedules are meant
 * to feel local ("weekdays at 08:00" in the enabler's timezone). Convert with
 * the enabler's UTC offset, shifting weekday fields across midnight when the
 * conversion crosses a day boundary.
 */
export function playbookCron(
  schedule: PlaybookSchedule,
  utcOffsetMinutes: number
) {
  const local = parseTime(schedule.time)
  const shifted = shiftToUtc(local, utcOffsetMinutes)
  const time = `${shifted.minute} ${shifted.hour}`

  if (schedule.repeat === "daily") {
    return `${time} * * *`
  }

  const localWeekdays =
    schedule.repeat === "weekdays" ? [1, 2, 3, 4, 5] : [schedule.weekday]
  const utcWeekdays = localWeekdays
    .map((weekday) => (weekday + shifted.dayShift + 7) % 7)
    .sort((left, right) => left - right)

  return `${time} * * ${weekdayField(utcWeekdays)}`
}

/** Contiguous ranges ("1-5") keep the shared cron labels readable. */
function weekdayField(weekdays: number[]) {
  const contiguous = weekdays.every(
    (weekday, index) => index === 0 || weekday === weekdays[index - 1] + 1
  )

  if (weekdays.length > 1 && contiguous) {
    return `${weekdays[0]}-${weekdays[weekdays.length - 1]}`
  }

  return weekdays.join(",")
}

function shiftToUtc(
  local: { hour: number; minute: number },
  utcOffsetMinutes: number
) {
  // Matches Date#getTimezoneOffset semantics: UTC = local + offset.
  const utcMinutes = local.hour * 60 + local.minute + utcOffsetMinutes
  const normalized =
    ((utcMinutes % minutesPerDay) + minutesPerDay) % minutesPerDay

  return {
    hour: Math.floor(normalized / 60),
    minute: normalized % 60,
    dayShift: Math.floor(utcMinutes / minutesPerDay),
  }
}

function parseTime(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time)

  if (match === null) {
    throw new Error(`Invalid playbook schedule time: ${time}`)
  }

  return { hour: Number(match[1]), minute: Number(match[2]) }
}

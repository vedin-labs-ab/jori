export type PulseDay = {
  key: string
  label: string
  emphasized: boolean
  title: string
  isToday: boolean
}

export type PulseCell = {
  day: PulseDay
  count: number
  efforts: string[]
}

export type PulseLane = {
  id: string | null
  name: string
  cells: PulseCell[]
  total: number
}

export type Pulse = {
  days: PulseDay[]
  lanes: PulseLane[]
}

export type PulseEntry = {
  observedAt: number
  effort: string
  workstreamId: string | null
}

export const pulseDayCount = 14

// The activity strip's read model: one column per calendar day ending today,
// one lane per workstream with in-window entries, and a final lane for
// entries whose effort is not yet placed (workstreamId null). Quiet lanes
// drop out so the strip only spends height on movement.
export function buildPulse(
  entries: PulseEntry[],
  workstreams: { id: string; name: string }[],
  now: number,
  dayCount = pulseDayCount
): Pulse {
  const days = pulseDays(now, dayCount)
  const lanes = [
    ...workstreams.map(({ id, name }) => buildLane(id, name, entries, days)),
    buildLane(null, "Unplaced", entries, days),
  ]

  return { days, lanes: lanes.filter((lane) => lane.total > 0) }
}

// Calendar-day columns, oldest first. Date arithmetic goes through the Date
// constructor so daylight-saving shifts cannot skip or double a column.
function pulseDays(now: number, dayCount: number): PulseDay[] {
  const today = new Date(now)
  const days = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - (dayCount - 1 - index)
    )
    const isToday = index === dayCount - 1

    return {
      key: date.toDateString(),
      label: axisLabel(date, index, isToday),
      emphasized: isToday || date.getDate() === 1,
      title: date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      isToday,
    }
  })

  return days.map((day, index) => {
    const previous = days[index - 1]

    return previous !== undefined && isWideAnchor(previous.label)
      ? { ...day, label: /^\d+$/.test(day.label) ? "" : day.label }
      : day
  })
}

// Anchor labels ("Jun 28", "Jul 1") are wider than one column, so the plain
// number right after one is dropped rather than collided with.
function isWideAnchor(label: string) {
  return label.includes(" ")
}

// Axis copy: today by name, the window start and month starts anchored with
// their month, bare day numbers everywhere between.
function axisLabel(date: Date, index: number, isToday: boolean) {
  if (isToday) {
    return "Today"
  }

  if (index === 0 || date.getDate() === 1) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  }

  return String(date.getDate())
}

function buildLane(
  id: string | null,
  name: string,
  entries: PulseEntry[],
  days: PulseDay[]
): PulseLane {
  const mine = entries.filter((entry) => entry.workstreamId === id)
  const cells = days.map((day) => buildCell(day, mine))

  return {
    id,
    name,
    cells,
    total: cells.reduce((sum, cell) => sum + cell.count, 0),
  }
}

function buildCell(day: PulseDay, entries: PulseEntry[]): PulseCell {
  const inDay = entries.filter(
    (entry) => new Date(entry.observedAt).toDateString() === day.key
  )

  return {
    day,
    count: inDay.length,
    efforts: [...new Set(inDay.map((entry) => entry.effort))],
  }
}

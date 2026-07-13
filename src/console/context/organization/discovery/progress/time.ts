/** Timing helpers for organization discovery progress. */
type TimedItem = {
  endedAt?: number
  startedAt: number
  status: string
}

type TimeInterval = {
  end: number
  start: number
}

export function taskElapsedMs(items: TimedItem[], now: number) {
  return mergedElapsedMs(items.flatMap((item) => itemInterval(item, now) ?? []))
}

function itemInterval(item: TimedItem, now: number): TimeInterval | null {
  if (item.status === "queued") {
    return null
  }

  const end = item.endedAt ?? now

  return end <= item.startedAt ? null : { end, start: item.startedAt }
}

function mergedElapsedMs(intervals: TimeInterval[]) {
  let elapsed = 0
  let current: TimeInterval | null = null

  for (const interval of [...intervals].sort((a, b) => a.start - b.start)) {
    if (current === null) {
      current = { ...interval }
    } else if (interval.start <= current.end) {
      current.end = Math.max(current.end, interval.end)
    } else {
      elapsed += current.end - current.start
      current = { ...interval }
    }
  }

  return current === null ? elapsed : elapsed + current.end - current.start
}

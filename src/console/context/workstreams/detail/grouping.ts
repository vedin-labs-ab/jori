const dayMs = 24 * 60 * 60 * 1000

export type TimelineDay<Item> = {
  key: string
  label: string
  items: Item[]
}

// Calendar-day grouping for a newest-first timeline. Purely mechanical:
// today and yesterday by name, other days by date, with the year only once
// it differs from the current one.
export function groupByDay<Item extends { observedAt: number }>(
  items: Item[],
  now: number
): TimelineDay<Item>[] {
  const days: TimelineDay<Item>[] = []

  for (const item of items) {
    const date = new Date(item.observedAt)
    const key = date.toDateString()
    const current = days.at(-1)

    if (current !== undefined && current.key === key) {
      current.items.push(item)
    } else {
      days.push({ key, label: dayLabel(date, now), items: [item] })
    }
  }

  return days
}

function dayLabel(date: Date, now: number) {
  const today = new Date(now)

  if (date.toDateString() === today.toDateString()) {
    return "Today"
  }

  if (date.toDateString() === new Date(now - dayMs).toDateString()) {
    return "Yesterday"
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  })
}

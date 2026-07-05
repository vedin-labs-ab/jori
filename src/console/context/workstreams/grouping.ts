const dayMs = 24 * 60 * 60 * 1000
const dayTierMs = 7 * dayMs
const weekTierMs = 30 * dayMs
const metaEfforts = 2

export type TimelineSection<Item> = {
  tier: "day" | "week" | "month"
  key: string
  label: string
  meta: string
  items: Item[]
}

// Tiered temporal grouping for a newest-first timeline: the last week under
// open day headers, the last month under collapsed week groups, everything
// older under collapsed month groups. Purely mechanical — labels come from
// the calendar and metas from counts and effort names, never from a model.
export function groupTimeline<
  Item extends { observedAt: number; effort: string },
>(items: Item[], now: number): TimelineSection<Item>[] {
  const sections: TimelineSection<Item>[] = []

  for (const item of items) {
    const placed = place(item.observedAt, now)
    const current = sections.at(-1)

    if (current !== undefined && current.key === placed.key) {
      current.items.push(item)
    } else {
      sections.push({ ...placed, meta: "", items: [item] })
    }
  }

  for (const section of sections) {
    section.meta = sectionMeta(section)
  }

  return sections
}

function place(observedAt: number, now: number) {
  const age = now - observedAt
  const date = new Date(observedAt)

  if (age < dayTierMs) {
    return {
      tier: "day" as const,
      key: `day:${date.toDateString()}`,
      label: dayLabel(date, now),
    }
  }

  if (age < weekTierMs) {
    const start = weekStart(date)

    return {
      tier: "week" as const,
      key: `week:${start.toDateString()}`,
      label: `Week of ${monthDay(start)}`,
    }
  }

  return {
    tier: "month" as const,
    key: `month:${date.getFullYear()}-${date.getMonth()}`,
    label: monthLabel(date, now),
  }
}

function sectionMeta(section: TimelineSection<{ effort: string }>) {
  if (section.tier === "day") {
    return ""
  }

  const count = section.items.length
  const efforts = [
    ...new Set(section.items.map((item) => item.effort).filter(Boolean)),
  ]
  const named = efforts.slice(0, metaEfforts).join(", ")
  const suffix = efforts.length > metaEfforts ? "…" : ""
  const updates = `${count} ${count === 1 ? "update" : "updates"}`

  return named === "" ? updates : `${updates} · ${named}${suffix}`
}

function dayLabel(date: Date, now: number) {
  const today = new Date(now)

  if (date.toDateString() === today.toDateString()) {
    return "Today"
  }

  if (date.toDateString() === new Date(now - dayMs).toDateString()) {
    return "Yesterday"
  }

  return monthDay(date)
}

function weekStart(date: Date) {
  const start = new Date(date)

  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))

  return start
}

function monthDay(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function monthLabel(date: Date, now: number) {
  const month = date.toLocaleDateString(undefined, { month: "long" })

  return date.getFullYear() === new Date(now).getFullYear()
    ? month
    : `${month} ${date.getFullYear()}`
}

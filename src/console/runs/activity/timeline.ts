import { type ActivityItem } from "./types"

export type ActivityTimelineEntry =
  | {
      id: string
      item: ActivityItem
      type: "item"
    }
  | {
      description: string
      durationMs?: number
      id: string
      isLive: boolean
      items: ActivityItem[]
      startedAt: number
      status: ActivityItem["status"]
      title: string
      type: "tool-group"
    }

export function createActivityTimeline(items: ActivityItem[]) {
  const entries: ActivityTimelineEntry[] = []
  let toolGroup: ActivityItem[] = []

  for (const item of items) {
    if (item.kind === "tool") {
      toolGroup.push(item)
      continue
    }

    flushToolGroup(entries, toolGroup)
    toolGroup = []
    entries.push({ id: item.id, item, type: "item" })
  }

  flushToolGroup(entries, toolGroup)

  return entries
}

function flushToolGroup(
  entries: ActivityTimelineEntry[],
  items: ActivityItem[]
) {
  if (items.length === 0) {
    return
  }

  if (items.length === 1) {
    entries.push({ id: items[0].id, item: items[0], type: "item" })
    return
  }

  entries.push({
    description: toolGroupDescription(items),
    durationMs: toolGroupDuration(items),
    id: `tools:${items[0].id}:${items.at(-1)?.id}`,
    isLive: items.some((item) => item.isLive === true),
    items,
    startedAt: Math.min(...items.map((item) => item.startedAt)),
    status: toolGroupStatus(items),
    title: toolGroupTitle(items),
    type: "tool-group",
  })
}

function toolGroupStatus(items: ActivityItem[]) {
  if (items.some((item) => item.status === "running")) {
    return "running"
  }

  return items.some((item) => item.status === "failed") ? "failed" : "completed"
}

function toolGroupTitle(items: ActivityItem[]) {
  return items.some((item) => item.status === "running")
    ? `Running ${items.length} actions`
    : `Ran ${items.length} actions`
}

function toolGroupDescription(items: ActivityItem[]) {
  const failed = items.filter((item) => item.status === "failed").length
  const completed = items.filter((item) => item.status === "completed").length
  const parts = [`${items.length} actions`]

  if (completed > 0) {
    parts.push(completed === 1 ? "1 result" : `${completed} results`)
  }

  if (failed > 0) {
    parts.push(failed === 1 ? "1 failed" : `${failed} failed`)
  }

  return parts.join(" · ")
}

function toolGroupDuration(items: ActivityItem[]) {
  const endedAt = items.flatMap((item) =>
    item.endedAt === undefined ? [] : [item.endedAt]
  )

  if (endedAt.length !== items.length) {
    return undefined
  }

  return Math.max(...endedAt) - Math.min(...items.map((item) => item.startedAt))
}

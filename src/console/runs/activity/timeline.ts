import {
  type ActivityToolKind,
  activityToolKind,
  activityToolOutcomeSummary,
} from "./tool-summary"
import { type ActivityItem } from "./types"

export type ActivityToolGroupKind = ActivityToolKind

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
      toolKind: ActivityToolGroupKind
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

  const toolKind = activityToolKind(items)

  entries.push({
    description: toolGroupDescription(items, toolKind),
    durationMs: toolGroupDuration(items),
    id: `tools:${items[0].id}:${items.at(-1)?.id}`,
    isLive: items.some((item) => item.isLive === true),
    items,
    startedAt: Math.min(...items.map((item) => item.startedAt)),
    status: toolGroupStatus(items),
    title: toolGroupTitle(items, toolKind),
    toolKind,
    type: "tool-group",
  })
}

function toolGroupStatus(items: ActivityItem[]) {
  if (items.some((item) => item.status === "running")) {
    return "running"
  }

  return items.some((item) => item.status === "failed") ? "failed" : "completed"
}

function toolGroupTitle(
  items: ActivityItem[],
  toolKind: ActivityToolGroupKind
) {
  const isRunning = items.some((item) => item.status === "running")

  switch (toolKind) {
    case "generic":
      return isRunning
        ? `Running ${items.length} actions`
        : `Ran ${items.length} actions`
    case "read":
      return isRunning ? "Reading files" : "Read files"
    case "send":
      return isRunning ? "Sending replies" : "Sent replies"
    case "web-fetch":
      return isRunning ? "Fetching web pages" : "Fetched web pages"
    case "web-search":
      return isRunning ? "Searching web" : "Searched web"
  }
}

function toolGroupDescription(
  items: ActivityItem[],
  toolKind: ActivityToolGroupKind
) {
  const failed = items.filter((item) => item.status === "failed").length
  const completed = items.filter((item) => item.status === "completed").length
  return activityToolOutcomeSummary({
    completed,
    failed,
    toolKind,
    total: items.length,
  })
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

import { type DiscoveryStep, type OrganizationDiscovery } from "./types"
import { sourceLabel } from "./url"

export type DiscoveryItemStatus = "active" | "completed" | "failed" | "queued"

export type DiscoveryTaskItem = {
  endedAt?: number
  key: string
  label: string
  startedAt: number
  status: DiscoveryItemStatus
  url: string
}

export type DiscoveryTask = {
  elapsedMs: number
  endedAt?: number
  items: DiscoveryTaskItem[]
  key: string
  label: string
  startedAt: number
  status: DiscoveryItemStatus
}

type StepEntry = {
  index: number
  step: ExplorationStep
}

type ExplorationStep = DiscoveryStep & {
  kind: "exploring" | "reading"
  url: string
}

export function createDiscoveryTasks(
  discovery: NonNullable<OrganizationDiscovery>,
  now: number
): DiscoveryTask[] {
  return taskGroups(discovery, now).map((group) => toTask(group, now))
}

function taskGroups(
  discovery: NonNullable<OrganizationDiscovery>,
  now: number
) {
  const groups = new Map<string, DiscoveryTaskItem[]>()

  for (const entry of explorationEntries(discovery.steps)) {
    const item = toItem(discovery, entry, nextStep(discovery.steps, entry), now)
    const key = domainKey(item.url)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  return [...groups.entries()]
}

function toTask(
  [key, items]: [string, DiscoveryTaskItem[]],
  now: number
): DiscoveryTask {
  const status = taskStatus(items)

  return {
    elapsedMs: taskElapsedMs(items, now),
    key,
    items,
    label: key,
    startedAt: Math.min(...items.map((item) => item.startedAt)),
    status,
    ...taskEnd(items, status),
  }
}

function toItem(
  discovery: NonNullable<OrganizationDiscovery>,
  entry: StepEntry,
  next: DiscoveryStep | undefined,
  now: number
): DiscoveryTaskItem {
  const status = itemStatus(discovery, entry.step, next, now)
  const endedAt = itemEnd(status, discovery, next)

  return {
    key: `${entry.step.at}-${entry.step.url}`,
    label: pageLabel(entry.step.url),
    startedAt: entry.step.at,
    status,
    url: entry.step.url,
    ...(endedAt === undefined ? {} : { endedAt }),
  }
}

function explorationEntries(steps: DiscoveryStep[]): StepEntry[] {
  const entries: StepEntry[] = []

  for (const [index, step] of steps.entries()) {
    if (isExplorationStep(step)) {
      entries.push({ index, step })
    }
  }

  return entries
}

function isExplorationStep(step: DiscoveryStep): step is ExplorationStep {
  return (
    step.url !== undefined &&
    (step.kind === "reading" || step.kind === "exploring")
  )
}

function nextStep(steps: DiscoveryStep[], entry: StepEntry) {
  return steps[entry.index + 1]
}

function itemStatus(
  discovery: NonNullable<OrganizationDiscovery>,
  step: DiscoveryStep,
  next: DiscoveryStep | undefined,
  now: number
): DiscoveryItemStatus {
  if (step.at > now) {
    return "queued"
  }

  if (next?.kind === "error" && next.at <= now) {
    return "failed"
  }

  if (next === undefined || next.at > now) {
    return finalItemStatus(discovery)
  }

  return "completed"
}

function finalItemStatus(
  discovery: NonNullable<OrganizationDiscovery>
): DiscoveryItemStatus {
  if (discovery.status === "failed") {
    return "failed"
  }

  return discovery.status === "running" ? "active" : "completed"
}

function itemEnd(
  status: DiscoveryItemStatus,
  discovery: NonNullable<OrganizationDiscovery>,
  next: DiscoveryStep | undefined
) {
  if (status === "active" || status === "queued") {
    return undefined
  }

  return next?.at ?? discovery.endedAt
}

function taskStatus(items: DiscoveryTaskItem[]): DiscoveryItemStatus {
  if (items.some((item) => item.status === "failed")) {
    return "failed"
  }

  if (items.some((item) => item.status === "active")) {
    return "active"
  }

  return items.every((item) => item.status === "queued")
    ? "queued"
    : "completed"
}

function taskEnd(items: DiscoveryTaskItem[], status: DiscoveryItemStatus) {
  const endedAt = Math.max(
    ...items.map((item) => item.endedAt ?? item.startedAt)
  )

  return status === "active" || status === "queued" ? {} : { endedAt }
}

type TimeInterval = {
  end: number
  start: number
}

function taskElapsedMs(items: DiscoveryTaskItem[], now: number) {
  return mergedElapsedMs(items.flatMap((item) => itemInterval(item, now) ?? []))
}

function itemInterval(
  item: DiscoveryTaskItem,
  now: number
): TimeInterval | null {
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

function domainKey(url: string) {
  try {
    return new URL(url).hostname.replace(/^www[.]/, "")
  } catch {
    return "Website"
  }
}

function pageLabel(url: string | undefined) {
  if (url === undefined) {
    return "Website"
  }

  try {
    const parsed = new URL(url)
    const path = `${parsed.pathname}${parsed.search}`.replace(/\/$/, "")

    return path === "" ? "/" : path
  } catch {
    return sourceLabel(url)
  }
}

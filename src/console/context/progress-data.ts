import { taskElapsedMs } from "./progress-time"
import {
  type DiscoveryItemStatus,
  type DiscoveryStep,
  type DiscoveryTask,
  type DiscoveryTaskItem,
  type DiscoveryTaskStatus,
  type OrganizationDiscovery,
} from "./types"
import { sourceLabel } from "./url"

type StepEntry = {
  step: ExplorationStep
}

type ExplorationStep = DiscoveryStep & {
  kind: "page"
  url: string
}

export function createDiscoveryTasks(
  discovery: NonNullable<OrganizationDiscovery>,
  now: number
): DiscoveryTask[] {
  return [
    ...explorationTasks(discovery, now),
    ...summaryTasks(discovery, now),
  ].sort((left, right) => left.startedAt - right.startedAt)
}

function explorationTasks(
  discovery: NonNullable<OrganizationDiscovery>,
  now: number
) {
  return taskGroups(discovery, now).map((group) =>
    toExplorationTask(discovery, group, now)
  )
}

function taskGroups(
  discovery: NonNullable<OrganizationDiscovery>,
  now: number
) {
  const groups = new Map<string, DiscoveryTaskItem[]>()

  for (const entry of explorationEntries(discovery.steps)) {
    const item = toItem(entry, now)
    const key = domainKey(item.url)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  return [...groups.entries()]
}

function toExplorationTask(
  discovery: NonNullable<OrganizationDiscovery>,
  [key, items]: [string, DiscoveryTaskItem[]],
  now: number
): DiscoveryTask {
  const status = taskStatus(discovery, items)

  return {
    elapsedMs: taskElapsedMs(items, now),
    key,
    items,
    label: key,
    startedAt: Math.min(...items.map((item) => item.startedAt)),
    status,
    type: "exploration",
    ...taskEnd(items, status),
  }
}

function summaryTasks(
  discovery: NonNullable<OrganizationDiscovery>,
  now: number
) {
  return discovery.steps.flatMap((step) =>
    step.kind === "summary" ? [toSummaryTask(step, now)] : []
  )
}

function toSummaryTask(step: DiscoveryStep, now: number): DiscoveryTask {
  const status = stepStatus(step, now)
  const endedAt = stepEnd(step, status)

  return {
    elapsedMs: summaryElapsedMs(step, endedAt, now),
    items: [],
    key: `${step.startedAt}-${step.label}`,
    label: step.label,
    startedAt: step.startedAt,
    status,
    type: "summary",
    ...(endedAt === undefined ? {} : { endedAt }),
  }
}

function toItem(entry: StepEntry, now: number): DiscoveryTaskItem {
  const status = stepStatus(entry.step, now)
  const endedAt = stepEnd(entry.step, status)

  return {
    key: `${entry.step.startedAt}-${entry.step.url}`,
    label: pageLabel(entry.step.url),
    startedAt: entry.step.startedAt,
    status,
    url: entry.step.url,
    ...(endedAt === undefined ? {} : { endedAt }),
  }
}

function explorationEntries(steps: DiscoveryStep[]): StepEntry[] {
  const entries: StepEntry[] = []

  for (const step of steps) {
    if (isExplorationStep(step)) {
      entries.push({ step })
    }
  }

  return entries
}

function isExplorationStep(step: DiscoveryStep): step is ExplorationStep {
  return step.kind === "page" && step.url !== undefined
}

function stepStatus(step: DiscoveryStep, now: number): DiscoveryItemStatus {
  if (step.startedAt > now) {
    return "queued"
  }

  if (step.error !== undefined) {
    return "failed"
  }

  if (step.completedAt !== undefined && step.completedAt <= now) {
    return "completed"
  }

  return "active"
}

function stepEnd(step: DiscoveryStep, status: DiscoveryItemStatus) {
  if (status === "active" || status === "queued") {
    return undefined
  }

  return step.completedAt
}

function taskStatus(
  discovery: NonNullable<OrganizationDiscovery>,
  items: DiscoveryTaskItem[]
): DiscoveryTaskStatus {
  if (items.some((item) => item.status === "active")) {
    return "active"
  }

  if (items.every((item) => item.status === "queued")) {
    return "queued"
  }

  if (items.some((item) => item.status === "failed")) {
    return discoveryFailed(discovery) ? "failed" : "warning"
  }

  return "completed"
}

function summaryElapsedMs(
  step: DiscoveryStep,
  endedAt: number | undefined,
  now: number
) {
  return Math.max(0, (endedAt ?? now) - step.startedAt)
}

function taskEnd(items: DiscoveryTaskItem[], status: DiscoveryTaskStatus) {
  const endedAt = Math.max(
    ...items.map((item) => item.endedAt ?? item.startedAt)
  )

  return status === "active" || status === "queued" ? {} : { endedAt }
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

export function discoveryReadyForReview(
  discovery: OrganizationDiscovery | undefined
) {
  if (
    discovery === undefined ||
    discovery === null ||
    discovery.status !== "completed"
  ) {
    return false
  }

  const summary = latestSummaryStep(discovery.steps)

  return (
    summary !== null &&
    summary.completedAt !== undefined &&
    summary.error === undefined
  )
}

export function discoveryFailed(discovery: OrganizationDiscovery | undefined) {
  if (
    discovery === undefined ||
    discovery === null ||
    discovery.status !== "completed"
  ) {
    return false
  }

  return !discoveryReadyForReview(discovery)
}

function latestSummaryStep(steps: DiscoveryStep[]) {
  return [...steps].reverse().find((step) => step.kind === "summary") ?? null
}

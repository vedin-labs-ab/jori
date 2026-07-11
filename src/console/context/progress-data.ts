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
  return taskGroups(discovery).map((group) =>
    toExplorationTask(discovery, group, now)
  )
}

function taskGroups(discovery: NonNullable<OrganizationDiscovery>) {
  const groups = new Map<string, DiscoveryTaskItem[]>()

  for (const step of discovery.steps) {
    if (!isExplorationStep(step)) {
      continue
    }

    const item = toItem(discovery, step)
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
    step.kind === "summary" ? [toSummaryTask(discovery, step, now)] : []
  )
}

function toSummaryTask(
  discovery: NonNullable<OrganizationDiscovery>,
  step: DiscoveryStep,
  now: number
): DiscoveryTask {
  const status = stepStatus(discovery, step)
  const endedAt = stepEnd(discovery, step, status)
  const startedAt = stepTime(discovery, step)

  return {
    elapsedMs: summaryElapsedMs(startedAt, endedAt, now),
    items: [],
    key: stepKey(step),
    label: step.label,
    startedAt,
    status,
    type: "summary",
    ...(endedAt === undefined ? {} : { endedAt }),
  }
}

function toItem(
  discovery: NonNullable<OrganizationDiscovery>,
  step: ExplorationStep
): DiscoveryTaskItem {
  const status = stepStatus(discovery, step)
  const endedAt = stepEnd(discovery, step, status)
  const startedAt = stepTime(discovery, step)

  return {
    key: stepKey(step),
    label: pageLabel(step.url),
    startedAt,
    status,
    url: step.url,
    ...(endedAt === undefined ? {} : { endedAt }),
  }
}

function isExplorationStep(step: DiscoveryStep): step is ExplorationStep {
  return step.kind === "page" && step.url !== undefined
}

function stepStatus(
  discovery: NonNullable<OrganizationDiscovery>,
  step: DiscoveryStep
): DiscoveryItemStatus {
  if (step.error !== undefined) {
    return "failed"
  }

  const completedAt = stepCompletedAt(discovery, step)

  if (completedAt !== undefined) {
    return "completed"
  }

  if (step.activeAt === undefined && step.queuedAt !== undefined) {
    return "queued"
  }

  return "active"
}

function stepEnd(
  discovery: NonNullable<OrganizationDiscovery>,
  step: DiscoveryStep,
  status: DiscoveryItemStatus
) {
  if (status === "active" || status === "queued") {
    return undefined
  }

  return stepCompletedAt(discovery, step)
}

function stepCompletedAt(
  discovery: NonNullable<OrganizationDiscovery>,
  step: DiscoveryStep
) {
  return step.completedAt ?? completedRunFallback(discovery)
}

function completedRunFallback(discovery: NonNullable<OrganizationDiscovery>) {
  return discovery.status === "completed" ? discovery.endedAt : undefined
}

function taskStatus(
  discovery: NonNullable<OrganizationDiscovery>,
  items: DiscoveryTaskItem[]
): DiscoveryTaskStatus {
  if (items.some((item) => item.status === "active")) {
    return "active"
  }

  if (items.some((item) => item.status === "queued")) {
    return items.every((item) => item.status === "queued") ? "queued" : "active"
  }

  if (items.some((item) => item.status === "failed")) {
    return discoveryFailed(discovery) ? "failed" : "warning"
  }

  return discovery.status === "running" && !hasSummaryStep(discovery.steps)
    ? "active"
    : "completed"
}

function summaryElapsedMs(
  startedAt: number,
  endedAt: number | undefined,
  now: number
) {
  return Math.max(0, (endedAt ?? now) - startedAt)
}

function taskEnd(items: DiscoveryTaskItem[], status: DiscoveryTaskStatus) {
  const endedAt = Math.max(
    ...items.map((item) => item.endedAt ?? item.startedAt)
  )

  return status === "active" || status === "queued" ? {} : { endedAt }
}

function stepKey(step: DiscoveryStep) {
  return step.id ?? `${step.startedAt ?? step.queuedAt ?? 0}-${step.label}`
}

function stepTime(
  discovery: NonNullable<OrganizationDiscovery>,
  step: DiscoveryStep
) {
  return step.activeAt ?? step.startedAt ?? step.queuedAt ?? discovery.startedAt
}

function hasSummaryStep(steps: DiscoveryStep[]) {
  return steps.some((step) => step.kind === "summary")
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
    stepCompletedAt(discovery, summary) !== undefined &&
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

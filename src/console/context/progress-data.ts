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
    const item = toItem(discovery, entry, nextStep(discovery.steps, entry), now)
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
  return discovery.steps.flatMap((step, index) =>
    step.kind === "extracting"
      ? [toSummaryTask(discovery, step, discovery.steps[index + 1], now)]
      : []
  )
}

function toSummaryTask(
  discovery: NonNullable<OrganizationDiscovery>,
  step: DiscoveryStep,
  next: DiscoveryStep | undefined,
  now: number
): DiscoveryTask {
  const status = summaryStatus(discovery, step, next, now)
  const endedAt = summaryEnd(discovery, status, next)

  return {
    elapsedMs: summaryElapsedMs(step, endedAt, now),
    items: [],
    key: `${step.at}-${step.label}`,
    label: step.label,
    startedAt: step.at,
    status,
    type: "summary",
    ...(endedAt === undefined ? {} : { endedAt }),
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
  step: ExplorationStep,
  next: DiscoveryStep | undefined,
  now: number
): DiscoveryItemStatus {
  if (step.at > now) {
    return "queued"
  }

  if (isPageError(next, step.url, now)) {
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

function isPageError(
  step: DiscoveryStep | undefined,
  url: string,
  now: number
) {
  return step?.kind === "error" && step.url === url && step.at <= now
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
    return discovery.status === "failed" ? "failed" : "warning"
  }

  return "completed"
}

function summaryStatus(
  discovery: NonNullable<OrganizationDiscovery>,
  step: DiscoveryStep,
  next: DiscoveryStep | undefined,
  now: number
): DiscoveryTaskStatus {
  if (step.at > now) {
    return "queued"
  }

  if (next === undefined || next.at > now) {
    return finalTaskStatus(discovery)
  }

  return "completed"
}

function finalTaskStatus(
  discovery: NonNullable<OrganizationDiscovery>
): DiscoveryTaskStatus {
  if (discovery.status === "failed") {
    return "failed"
  }

  return discovery.status === "running" ? "active" : "completed"
}

function summaryEnd(
  discovery: NonNullable<OrganizationDiscovery>,
  status: DiscoveryTaskStatus,
  next: DiscoveryStep | undefined
) {
  if (status === "active" || status === "queued") {
    return undefined
  }

  return next?.at ?? discovery.endedAt
}

function summaryElapsedMs(
  step: DiscoveryStep,
  endedAt: number | undefined,
  now: number
) {
  return Math.max(0, (endedAt ?? now) - step.at)
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

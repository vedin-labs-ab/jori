import {
  type DiscoveryItemStatus,
  type DiscoveryStep,
  type DiscoveryTask,
  type DiscoveryTaskItem,
  type DiscoveryTaskStatus,
  type OrganizationDiscovery,
} from "../../types"
import { sourceLabel } from "../url"
import { taskElapsedMs } from "./time"

type Discovery = NonNullable<OrganizationDiscovery>

export function createDiscoveryTasks(
  discovery: Discovery,
  now: number
): DiscoveryTask[] {
  const groups = new Map<string, DiscoveryTaskItem[]>()
  const summaries: DiscoveryTask[] = []

  for (const step of discovery.steps) {
    const item = stepState(discovery, step)

    if (step.kind === "summary") {
      summaries.push({
        ...item,
        elapsedMs: Math.max(0, (item.endedAt ?? now) - item.startedAt),
        items: [],
        label: step.label,
        type: "summary",
      })
    } else if (step.kind === "page" && step.url !== undefined) {
      const key = domainKey(step.url)
      const items = groups.get(key) ?? []
      items.push({ ...item, label: pageLabel(step.url), url: step.url })
      groups.set(key, items)
    }
  }

  // Exploration precedes summaries when their start times tie.
  const exploration = [...groups].map(([key, items]): DiscoveryTask => {
    const status = taskStatus(discovery, items)

    return {
      elapsedMs: taskElapsedMs(items, now),
      key,
      items,
      label: key,
      startedAt: Math.min(...items.map((item) => item.startedAt)),
      status,
      type: "exploration",
      ...(status === "active" || status === "queued"
        ? {}
        : {
            endedAt: Math.max(
              ...items.map((item) => item.endedAt ?? item.startedAt)
            ),
          }),
    }
  })

  return [...exploration, ...summaries].sort(
    (left, right) => left.startedAt - right.startedAt
  )
}

/** Page items and summaries share the same lifecycle and timing fallbacks. */
function stepState(discovery: Discovery, step: DiscoveryStep) {
  const endedAt = stepCompletedAt(discovery, step)
  let status: DiscoveryItemStatus = "active"

  if (step.error !== undefined) {
    status = "failed"
  } else if (endedAt !== undefined) {
    status = "completed"
  } else if (step.activeAt === undefined && step.queuedAt !== undefined) {
    status = "queued"
  }

  return {
    key: step.id ?? `${step.startedAt ?? step.queuedAt ?? 0}-${step.label}`,
    startedAt:
      step.activeAt ?? step.startedAt ?? step.queuedAt ?? discovery.startedAt,
    status,
    ...(endedAt === undefined ? {} : { endedAt }),
  }
}

function stepCompletedAt(discovery: Discovery, step: DiscoveryStep) {
  return (
    step.completedAt ??
    (discovery.status === "completed" ? discovery.endedAt : undefined)
  )
}

function taskStatus(
  discovery: Discovery,
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

  return discovery.status === "running" &&
    !discovery.steps.some((step) => step.kind === "summary")
    ? "active"
    : "completed"
}

function domainKey(url: string) {
  try {
    return new URL(url).hostname.replace(/^www[.]/, "")
  } catch {
    return "Website"
  }
}

function pageLabel(url: string) {
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

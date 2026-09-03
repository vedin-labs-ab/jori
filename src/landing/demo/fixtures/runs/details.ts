import { toolSurfaceLabel } from "@contracts/integrations"
import { summarizeToolCapabilities } from "@contracts/permissions"
import { makeExecution } from "@/shared/console/runs/fixtures"
import {
  type ExecutionDetail,
  type ExecutionDetailTool,
  type ExecutionItem,
  type ExecutionSource,
} from "@/shared/console/runs/types"
import { toolCapability } from "@/shared/console/tools/model"
import { demoId } from "../ids"
import { demoTimezone, jobId } from "../jobs"

// What a run is made of, built the way the console projects it: a source
// with its surface and kind, facts with their icons, and the tools it was
// prepared with, grouped by surface with their catalog descriptions.

type RunSpec = {
  id: string
  title: string
  task: string
  result?: string
  error?: string
  status?: ExecutionItem["status"]
  audience?: ExecutionItem["audience"]
  startedAgo: number
  durationMs?: number
  source: ExecutionSource
  details: ExecutionDetail[]
  approval?: ExecutionItem["approval"]
  /** The key of the job the run came from; its name is the run's title. */
  job?: string
}

export function run(now: number, spec: RunSpec): ExecutionItem {
  const createdAt = now - spec.startedAgo
  const status = spec.status ?? "completed"
  const isOngoing = status === "queued" || status === "running"
  const endedAt =
    isOngoing || spec.durationMs === undefined
      ? undefined
      : createdAt + spec.durationMs

  return makeExecution({
    id: demoId("runs", spec.id),
    title: spec.title,
    task: spec.task,
    result: spec.result,
    error: spec.error,
    status,
    audience: spec.audience ?? "organization",
    createdAt,
    endedAt,
    durationMs: endedAt === undefined ? undefined : spec.durationMs,
    source: spec.source,
    job:
      spec.job === undefined ? null : { id: jobId(spec.job), name: spec.title },
    trigger: spec.source.type === "job" ? "Schedule" : "Mention",
    details: spec.details,
    approval: spec.approval ?? null,
    searchableText: [spec.title, spec.task, status, spec.source.surface]
      .join(" ")
      .toLowerCase(),
  })
}

/** A scheduled job's run, which Jori itself starts. */
export function recurring(): ExecutionSource {
  return {
    type: "job",
    surface: "jori",
    kind: { type: "recurring", label: "recurring" },
  }
}

/** A run a mention started, in the thread the link points at. */
export function mention(
  surface: ExecutionSource["surface"],
  url: string
): ExecutionSource {
  return {
    type: "message",
    surface,
    url,
    kind: { type: "mention", label: "mention" },
  }
}

export function schedule(label: string) {
  return detail("schedule", `${label} ${demoTimezone}`)
}

export function detail(
  type: ExecutionDetail["type"],
  label: string,
  url?: string,
  timestamp?: number
): ExecutionDetail {
  return {
    type,
    label,
    ...(url === undefined ? {} : { url }),
    ...(timestamp === undefined ? {} : { timestamp }),
  }
}

/** The run's tools, grouped by surface the way the console lists them. */
export function tools(
  groups: [surface: string, tools: string[]][]
): ExecutionDetail {
  const detailGroups = groups.map(([type, names]) => ({
    type,
    label: toolSurfaceLabel(type),
    tools: names.map(toolCapability),
  }))

  return {
    type: "tools",
    label: detailGroups.map(groupLabel).join(" · "),
    groups: detailGroups,
  }
}

function groupLabel(group: { label: string; tools: ExecutionDetailTool[] }) {
  const counts = summarizeToolCapabilities(group.tools)

  return [
    group.label,
    counts.read > 0 ? `Read ${counts.read}` : undefined,
    counts.write > 0 ? `Write ${counts.write}` : undefined,
  ]
    .filter((part) => part !== undefined)
    .join(" · ")
}

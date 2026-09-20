import { isRecord } from "../../../../contracts/json"
import { type Doc } from "../../../_generated/dataModel"
import { optionalString } from "../../../shared/input"
import { humanizeToolName } from "../../../shared/tools/names"
import { type ToolResult } from "../../execution/traces/schema"
import { inputDescription, inputDetails } from "../format"
import { toolMetadata } from "../metadata"
import { readPreparedTools, readToolResult } from "../read"
import {
  type ActivityData,
  type ActivityDetail,
  type ActivityItem,
  type ActivityStatus,
  type ToolLabel,
} from "../types"

const hiddenToolNames = new Set(["finish_run", "start_agent"])

type ToolTrace = Extract<
  Doc<"traces">,
  { type: "tool.started" | "tool.waiting" | "tool.completed" | "tool.failed" }
>

type ToolProjectionContext = {
  agents: Doc<"runs">[]
  isRunLive: boolean
  labels: Map<string, ToolLabel>
  materialNames: ReadonlyMap<string, string>
}

export function projectToolTraces(
  data: ActivityData,
  isRunLive: boolean
): ActivityItem[] {
  const { agents, collections, touched, traces } = data
  const context: ToolProjectionContext = {
    agents,
    isRunLive,
    labels: toolLabels(traces),
    materialNames: new Map(
      [...collections, ...touched].map((material) => [
        material._id as string,
        material.name,
      ])
    ),
  }
  const groups = new Map<string, ToolTrace[]>()

  for (const trace of traces) {
    if (!isToolTrace(trace)) {
      continue
    }

    const name = optionalString(trace.data.tool.name)

    if (name === undefined || hiddenToolNames.has(name)) {
      continue
    }

    const key = toolTraceKey(trace, name)
    groups.set(key, [...(groups.get(key) ?? []), trace])
  }

  return [...groups.values()].map((group) => projectToolGroup(group, context))
}

function projectToolGroup(
  group: ToolTrace[],
  context: ToolProjectionContext
): ActivityItem {
  const { agents, isRunLive, labels, materialNames } = context
  const started = group.find((trace) => trace.type === "tool.started")
  const waiting = group.find((trace) => trace.type === "tool.waiting")
  const terminal = group.find(
    (trace) => trace.type === "tool.completed" || trace.type === "tool.failed"
  )
  const trace = terminal ?? waiting ?? started ?? group[0]
  const input = isRecord(started?.data.input) ? started.data.input : undefined
  const result =
    terminal?.type === "tool.completed"
      ? readToolResult(terminal.data.result)
      : undefined
  const error =
    terminal?.type === "tool.failed"
      ? optionalString(terminal.data.error)
      : undefined
  const name = optionalString(trace.data.tool.name) ?? "tool"
  const label = labels.get(name)
  const status = toolStatus(trace)
  const startedAt = started?.timestamp ?? trace.timestamp
  const endedAt = (waiting ?? terminal)?.timestamp
  const metadata = toolMetadata({
    agents,
    input,
    materialNames,
    result,
    tool: name,
  })

  return {
    id: trace._id,
    kind: "tool",
    status,
    title: toolTitle(name, label, status),
    access: label?.access ?? trace.data.tool.access,
    description: toolDescription(input, error, metadata),
    details: toolDetails(input, result, error),
    durationMs: endedAt === undefined ? undefined : endedAt - startedAt,
    endedAt,
    isLive: status === "running" && isRunLive,
    metadata: metadata.length === 0 ? undefined : metadata,
    startedAt,
    tool: name,
  }
}

function toolTitle(
  name: string,
  label: ToolLabel | undefined,
  status: ActivityStatus
) {
  const title = label?.label ?? humanizeToolName(name)

  return status === "failed" ? `${title} failed` : title
}

function toolDescription(
  input: Record<string, unknown> | undefined,
  error: string | undefined,
  metadata: ReturnType<typeof toolMetadata>
) {
  if (error !== undefined) {
    return error
  }

  if (metadata.length > 0) {
    return undefined
  }

  return inputDescription(input)
}

function toolDetails(
  input: Record<string, unknown> | undefined,
  result: ToolResult | undefined,
  error: string | undefined
) {
  return [
    ...inputDetails(input),
    ...resultDetails(result),
    ...errorDetails(error),
  ]
}

function resultDetails(result: ToolResult | undefined) {
  if (result === undefined) {
    return []
  }

  return [
    { label: "Result", value: result.kind },
    result.kind !== "string"
      ? undefined
      : { label: "Result length", value: String(result.length) },
    "size" in result
      ? { label: "Result size", value: String(result.size) }
      : undefined,
  ].filter((detail) => detail !== undefined)
}

function errorDetails(error: string | undefined): ActivityDetail[] {
  return error === undefined ? [] : [{ label: "Error", value: error }]
}

function toolStatus(trace: ToolTrace): ActivityStatus {
  if (trace.type === "tool.failed") {
    return "failed"
  }

  if (trace.type === "tool.waiting") {
    return "waiting"
  }

  return trace.type === "tool.completed" ? "completed" : "running"
}

function isToolTrace(trace: Doc<"traces">): trace is ToolTrace {
  return (
    trace.type === "tool.started" ||
    trace.type === "tool.waiting" ||
    trace.type === "tool.completed" ||
    trace.type === "tool.failed"
  )
}

function toolLabels(traces: Doc<"traces">[]) {
  const labels = new Map<string, ToolLabel>()

  for (const trace of traces) {
    if (trace.type !== "run.prepared") {
      continue
    }

    for (const tool of readPreparedTools(trace.data.tools)) {
      labels.set(tool.tool, tool)
    }
  }

  return labels
}

function toolTraceKey(trace: ToolTrace, name: string) {
  return trace.callId ?? `${trace.sequence ?? 0}:${name}`
}

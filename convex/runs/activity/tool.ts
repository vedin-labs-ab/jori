import { type Doc } from "../../_generated/dataModel"
import { fieldLabel, formatToolName } from "./format"
import {
  readPreparedTools,
  readToolAccess,
  readToolError,
  readToolInput,
  readToolName,
  readToolResult,
} from "./read"
import {
  type ActivityDetail,
  type ActivityItem,
  type ActivityStatus,
  type ToolLabel,
} from "./types"

const hiddenToolNames = new Set(["finish_run", "start_agent"])
const toolTerminalTypes = new Set(["tool.completed", "tool.failed"])

export function projectToolTraces(
  traces: Doc<"traces">[],
  isRunLive: boolean
): ActivityItem[] {
  const labels = toolLabels(traces)
  const groups = new Map<string, Doc<"traces">[]>()

  for (const trace of traces) {
    const name = groupedToolName(trace)

    if (name === undefined) {
      continue
    }

    const key = toolTraceKey(trace, name)
    groups.set(key, [...(groups.get(key) ?? []), trace])
  }

  return [...groups.values()].map((group) =>
    projectToolGroup(group, labels, isRunLive)
  )
}

function projectToolGroup(
  group: Doc<"traces">[],
  labels: Map<string, ToolLabel>,
  isRunLive: boolean
): ActivityItem {
  const started = group.find((trace) => trace.type === "tool.started")
  const terminal = group.find((trace) => toolTerminalTypes.has(trace.type))
  const trace = terminal ?? started ?? group[0]
  const name = readToolName(trace.data) ?? "tool"
  const label = labels.get(name)
  const status = toolStatus(trace)
  const startedAt = started?.timestamp ?? trace.timestamp
  const endedAt = terminal?.timestamp

  return {
    id: trace._id,
    kind: "tool",
    status,
    title: toolTitle(name, label, status),
    access: label?.access ?? readToolAccess(trace.data),
    description: toolDescription(started?.data, terminal?.data),
    details: toolDetails(started?.data, terminal?.data),
    durationMs: endedAt === undefined ? undefined : endedAt - startedAt,
    endedAt,
    isLive: status === "running" && isRunLive,
    startedAt,
  }
}

function toolTitle(
  name: string,
  label: ToolLabel | undefined,
  status: ActivityStatus
) {
  const title = label?.label ?? formatToolName(name)

  return status === "failed" ? `${title} failed` : title
}

function toolDescription(
  started: Doc<"traces">["data"] | undefined,
  terminal: Doc<"traces">["data"] | undefined
) {
  return (
    readToolError(terminal) ??
    inputDescription(readToolInput(started)) ??
    resultDescription(readToolResult(terminal))
  )
}

function inputDescription(input: Record<string, unknown> | undefined) {
  if (input === undefined) {
    return undefined
  }

  return (
    stringField(input.command) ??
    stringArrayField(input.args) ??
    stringField(input.pattern) ??
    stringField(input.path) ??
    stringField(input.directory) ??
    stringField(input.repo)
  )
}

function toolDetails(
  started: Doc<"traces">["data"] | undefined,
  terminal: Doc<"traces">["data"] | undefined
) {
  return [
    ...inputDetails(readToolInput(started)),
    ...resultDetails(readToolResult(terminal)),
    ...errorDetails(readToolError(terminal)),
  ]
}

function inputDetails(input: Record<string, unknown> | undefined) {
  if (input === undefined) {
    return []
  }

  return Object.entries(input).flatMap(([key, value]) => {
    const detail = detailValue(value)

    return detail === undefined
      ? []
      : [{ label: fieldLabel(key), value: detail }]
  })
}

function resultDetails(result: ReturnType<typeof readToolResult>) {
  if (result === undefined) {
    return []
  }

  return [
    { label: "Result", value: result.type },
    result.size === undefined
      ? undefined
      : { label: "Result size", value: String(result.size) },
  ].filter((detail) => detail !== undefined)
}

function resultDescription(result: ReturnType<typeof readToolResult>) {
  if (result === undefined) {
    return undefined
  }

  return result.size === undefined
    ? `Returned ${result.type}.`
    : `Returned ${result.type} (${result.size}).`
}

function errorDetails(error: string | undefined): ActivityDetail[] {
  return error === undefined ? [] : [{ label: "Error", value: error }]
}

function toolStatus(trace: Doc<"traces">): ActivityStatus {
  if (trace.type === "tool.failed") {
    return "failed"
  }

  return trace.type === "tool.completed" ? "completed" : "running"
}

function groupedToolName(trace: Doc<"traces">) {
  if (trace.type !== "tool.started" && !toolTerminalTypes.has(trace.type)) {
    return undefined
  }

  const name = readToolName(trace.data)

  return name === undefined || hiddenToolNames.has(name) ? undefined : name
}

function toolLabels(traces: Doc<"traces">[]) {
  const labels = new Map<string, ToolLabel>()

  for (const trace of traces) {
    for (const tool of readPreparedTools(trace.data)) {
      labels.set(tool.tool, tool)
    }
  }

  return labels
}

function toolTraceKey(trace: Doc<"traces">, name: string) {
  return trace.callId ?? `${trace.attempt ?? 0}:${trace.sequence ?? 0}:${name}`
}

function detailValue(value: unknown) {
  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number") {
    return String(value)
  }

  return Array.isArray(value) ? stringArrayField(value) : undefined
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
}

function stringArrayField(value: unknown) {
  return Array.isArray(value) &&
    value.every((entry) => typeof entry === "string")
    ? value.join(" ")
    : undefined
}

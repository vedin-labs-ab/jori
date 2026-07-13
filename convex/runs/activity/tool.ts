import { type Doc, type Id } from "../../_generated/dataModel"
import { formatToolName, inputDescription, inputDetails } from "./format"
import { toolMetadata } from "./metadata"
import {
  readPreparedTools,
  readToolAccess,
  readToolError,
  readToolInput,
  readToolName,
  readToolResult,
  readTraceData,
  traceAttempt,
  traceSequence,
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
  agents: Doc<"runs">[],
  artifacts: Doc<"artifacts">[],
  runArtifactId: Id<"artifacts"> | undefined,
  isRunLive: boolean
): ActivityItem[] {
  const labels = toolLabels(traces)
  const artifactTitles = new Map(
    artifacts.map((artifact) => [artifact._id, artifact.title])
  )
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
    projectToolGroup(
      group,
      labels,
      agents,
      artifactTitles,
      runArtifactId,
      isRunLive
    )
  )
}

function projectToolGroup(
  group: Doc<"traces">[],
  labels: Map<string, ToolLabel>,
  agents: Doc<"runs">[],
  artifactTitles: ReadonlyMap<string, string>,
  runArtifactId: Id<"artifacts"> | undefined,
  isRunLive: boolean
): ActivityItem {
  const started = group.find((trace) => trace.type === "tool.started")
  const waiting = group.find((trace) => trace.type === "tool.waiting")
  const terminal = group.find((trace) => toolTerminalTypes.has(trace.type))
  const trace = terminal ?? waiting ?? started ?? group[0]
  const traceData = readTraceData(trace)
  const startedData = started === undefined ? undefined : readTraceData(started)
  const terminalData =
    terminal === undefined ? undefined : readTraceData(terminal)
  const name = readToolName(traceData) ?? "tool"
  const label = labels.get(name)
  const status = toolStatus(trace)
  const startedAt = started?.timestamp ?? trace.timestamp
  const endedAt = (waiting ?? terminal)?.timestamp
  const metadata = toolMetadata({
    agents,
    artifactTitles,
    input: readToolInput(startedData),
    result: readToolResult(terminalData),
    runArtifactId,
    tool: name,
  })

  return {
    id: trace._id,
    kind: "tool",
    status,
    title: toolTitle(name, label, status),
    access: label?.access ?? readToolAccess(traceData),
    description: toolDescription(startedData, terminalData, metadata),
    details: toolDetails(startedData, terminalData),
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
  const title = label?.label ?? formatToolName(name)

  return status === "failed" ? `${title} failed` : title
}

function toolDescription(
  started: unknown,
  terminal: unknown,
  metadata: ReturnType<typeof toolMetadata>
) {
  const error = readToolError(terminal)

  if (error !== undefined) {
    return error
  }

  if (metadata.length > 0) {
    return undefined
  }

  return inputDescription(readToolInput(started))
}

function toolDetails(started: unknown, terminal: unknown) {
  return [
    ...inputDetails(readToolInput(started)),
    ...resultDetails(readToolResult(terminal)),
    ...errorDetails(readToolError(terminal)),
  ]
}

function resultDetails(result: ReturnType<typeof readToolResult>) {
  if (result === undefined) {
    return []
  }

  return [
    { label: "Result", value: result.kind },
    result.kind !== "string" || result.length === undefined
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

function toolStatus(trace: Doc<"traces">): ActivityStatus {
  if (trace.type === "tool.failed") {
    return "failed"
  }

  if (trace.type === "tool.waiting") {
    return "waiting"
  }

  return trace.type === "tool.completed" ? "completed" : "running"
}

function groupedToolName(trace: Doc<"traces">) {
  if (
    trace.type !== "tool.started" &&
    trace.type !== "tool.waiting" &&
    !toolTerminalTypes.has(trace.type)
  ) {
    return undefined
  }

  const name = readToolName(readTraceData(trace))

  return name === undefined || hiddenToolNames.has(name) ? undefined : name
}

function toolLabels(traces: Doc<"traces">[]) {
  const labels = new Map<string, ToolLabel>()

  for (const trace of traces) {
    for (const tool of readPreparedTools(readTraceData(trace))) {
      labels.set(tool.tool, tool)
    }
  }

  return labels
}

function toolTraceKey(trace: Doc<"traces">, name: string) {
  return (
    traceCallId(trace) ??
    `${traceAttempt(trace)}:${traceSequence(trace) ?? 0}:${name}`
  )
}

function traceCallId(trace: Doc<"traces">) {
  return "callId" in trace ? trace.callId : undefined
}

import { type Doc } from "../../_generated/dataModel"
import {
  type ModelUsage,
  readModelName,
  readModelReasoning,
  readModelUsage,
  readTraceData,
  readTraceError,
  traceSequence,
} from "./read"
import {
  type ActivityDetail,
  type ActivityItem,
  type ActivityTokenUsage,
} from "./types"

export function projectModelTraces(
  traces: Doc<"traces">[],
  isRunLive: boolean
): ActivityItem[] {
  const starts = new Map<string, Doc<"traces">>()
  const terminals = new Map<string, Doc<"traces">>()

  for (const trace of traces) {
    if (trace.type === "model.started") {
      starts.set(modelTraceKey(trace), trace)
    } else if (isTerminalModelTrace(trace)) {
      terminals.set(modelTraceKey(trace), trace)
    }
  }

  return [
    ...[...terminals.values()].map((trace) =>
      projectModelTerminal(trace, starts.get(modelTraceKey(trace)))
    ),
    ...[...starts]
      .filter(([key]) => !terminals.has(key))
      .map(([, trace]) => projectModelStart(trace, isRunLive)),
  ]
}

function projectModelStart(
  trace: Doc<"traces">,
  isRunLive: boolean
): ActivityItem {
  return {
    id: trace._id,
    kind: "model",
    status: "running",
    title: "Thinking",
    isLive: isRunLive,
    startedAt: trace.timestamp,
  }
}

function projectModelTerminal(
  trace: Doc<"traces">,
  started: Doc<"traces"> | undefined
): ActivityItem {
  const failed = trace.type === "model.failed"
  const data = readTraceData(trace)
  const usage = readModelUsage(data)
  const reasoning = failed ? undefined : readModelReasoning(data)

  return {
    id: trace._id,
    kind: "model",
    status: failed ? "failed" : "completed",
    title: failed ? "Model request failed" : "Model step completed",
    description: failed ? readTraceError(data) : modelSummary(usage),
    details: modelDetails(usage, readModelName(data)),
    durationMs: usage?.durationMs,
    endedAt: trace.timestamp,
    ...(reasoning === undefined ? {} : { reasoning }),
    startedAt: started?.timestamp ?? trace.timestamp,
    tokenUsage: modelTokenUsage(usage),
  }
}

function modelSummary(usage: ModelUsage | undefined) {
  const toolCalls = usage?.toolCalls ?? 0

  if (toolCalls === 0) {
    return "Returned control without an action."
  }

  return toolCalls === 1
    ? "Selected 1 action."
    : `Selected ${toolCalls} actions.`
}

function modelTokenUsage(
  usage: ModelUsage | undefined
): ActivityTokenUsage | undefined {
  if (usage === undefined) {
    return undefined
  }

  return {
    input: usage.tokens.input,
    output: usage.tokens.output,
    reasoning: usage.tokens.reasoning,
    total: usage.tokens.total,
  }
}

function modelDetails(
  usage: ModelUsage | undefined,
  model: string | undefined
) {
  if (usage === undefined) {
    return undefined
  }

  const details = [
    model === undefined ? undefined : { label: "Model", value: model },
    metricDetail("Input tokens", usage.tokens.input),
    metricDetail("Output tokens", usage.tokens.output),
    metricDetail("Reasoning tokens", usage.tokens.reasoning),
    metricDetail("Total tokens", usage.tokens.total),
    metricDetail("Tool calls", usage.toolCalls),
  ].filter((detail) => detail !== undefined)

  return details.length === 0 ? undefined : details
}

function metricDetail(
  label: string,
  value: number
): ActivityDetail | undefined {
  return value === 0
    ? undefined
    : { label, value: new Intl.NumberFormat("en").format(value) }
}

function modelTraceKey(trace: Doc<"traces">) {
  return String(traceSequence(trace) ?? trace.timestamp)
}

function isTerminalModelTrace(trace: Doc<"traces">) {
  return trace.type === "model.completed" || trace.type === "model.failed"
}

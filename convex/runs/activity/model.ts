import { type Doc } from "../../_generated/dataModel"
import { type EventData, readEventData } from "./read"
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
  const event = readEventData(trace.data)

  return {
    id: trace._id,
    kind: "model",
    status: "running",
    title: event?.title ?? "Thinking",
    details: modelDetails(trace.data),
    isLive: isRunLive,
    startedAt: trace.timestamp,
  }
}

function projectModelTerminal(
  trace: Doc<"traces">,
  started: Doc<"traces"> | undefined
): ActivityItem {
  const event = readEventData(trace.data)
  const failed = trace.type === "model.failed"
  const tokenUsage = modelTokenUsage(event?.metrics)

  return {
    id: trace._id,
    kind: "model",
    status: failed ? "failed" : "completed",
    title: event?.title ?? (failed ? "Model request failed" : "Model step"),
    description: failed ? event?.summary : undefined,
    details: modelDetails(trace.data),
    durationMs: event?.metrics?.durationMs,
    endedAt: trace.timestamp,
    startedAt: started?.timestamp ?? trace.timestamp,
    tokenUsage,
  }
}

function modelTokenUsage(
  metrics: EventData["metrics"] | undefined
): ActivityTokenUsage | undefined {
  if (
    metrics?.inputTokens === undefined &&
    metrics?.outputTokens === undefined &&
    metrics?.reasoningTokens === undefined &&
    metrics?.totalTokens === undefined
  ) {
    return undefined
  }

  const input = metrics.inputTokens ?? 0
  const output = metrics.outputTokens ?? 0
  const reasoning = metrics.reasoningTokens ?? 0

  return {
    input,
    output,
    reasoning,
    total: metrics.totalTokens ?? input + output + reasoning,
  }
}

function modelDetails(data: Doc<"traces">["data"] | undefined) {
  const metrics = readEventData(data)?.metrics

  if (metrics === undefined) {
    return undefined
  }

  return [
    metricDetail("Input tokens", metrics.inputTokens),
    metricDetail("Output tokens", metrics.outputTokens),
    metricDetail("Reasoning tokens", metrics.reasoningTokens),
    metricDetail("Total tokens", metrics.totalTokens),
    metricDetail("Tool calls", metrics.toolCalls),
  ].filter((detail) => detail !== undefined)
}

function metricDetail(
  label: string,
  value: number | undefined
): ActivityDetail | undefined {
  return value === undefined
    ? undefined
    : { label, value: new Intl.NumberFormat("en").format(value) }
}

function modelTraceKey(trace: Doc<"traces">) {
  return `${trace.attempt ?? 0}:${trace.sequence ?? trace.timestamp}`
}

function isTerminalModelTrace(trace: Doc<"traces">) {
  return trace.type === "model.completed" || trace.type === "model.failed"
}

import { type Doc } from "../../_generated/dataModel"
import { readEventData } from "./read"
import { type ActivityDetail, type ActivityItem } from "./types"

export function projectModelTraces(traces: Doc<"traces">[]): ActivityItem[] {
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
      .map(([, trace]) => projectModelStart(trace)),
  ]
}

function projectModelStart(trace: Doc<"traces">): ActivityItem {
  const event = readEventData(trace.data)

  return {
    id: trace._id,
    kind: "model",
    status: "running",
    title: event?.title ?? "Thinking",
    details: modelDetails(trace.data),
    startedAt: trace.timestamp,
  }
}

function projectModelTerminal(
  trace: Doc<"traces">,
  started: Doc<"traces"> | undefined
): ActivityItem {
  const event = readEventData(trace.data)
  const failed = trace.type === "model.failed"

  return {
    id: trace._id,
    kind: "model",
    status: failed ? "failed" : "completed",
    title: event?.title ?? (failed ? "Model request failed" : "Model step"),
    description: event?.summary,
    details: modelDetails(trace.data),
    durationMs: event?.metrics?.durationMs,
    endedAt: trace.timestamp,
    startedAt: started?.timestamp ?? trace.timestamp,
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

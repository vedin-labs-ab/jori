import { type Doc } from "../../_generated/dataModel"
import { optionalString } from "../../shared/input"
import { type ModelUsage, readModelUsage } from "./read"
import {
  type ActivityDetail,
  type ActivityItem,
  type ActivityTokenUsage,
} from "./types"

type ModelTrace = Extract<
  Doc<"traces">,
  { type: "model.started" | "model.completed" | "model.failed" }
>
type ModelTerminal = Exclude<ModelTrace, { type: "model.started" }>

const modelReasoningCharacterLimit = 1500

export function projectModelTraces(
  traces: Doc<"traces">[],
  isRunLive: boolean
): ActivityItem[] {
  const starts = new Map<string, ModelTrace>()
  const terminals = new Map<string, ModelTerminal>()

  for (const trace of traces) {
    if (trace.type === "model.started") {
      starts.set(modelTraceKey(trace), trace)
    } else if (
      trace.type === "model.completed" ||
      trace.type === "model.failed"
    ) {
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
  trace: ModelTrace,
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
  trace: ModelTerminal,
  started: ModelTrace | undefined
): ActivityItem {
  const failed = trace.type === "model.failed"
  const usage = failed ? undefined : readModelUsage(trace.data.usage)
  const model = failed ? undefined : optionalString(trace.data.model)
  const reasoning = failed
    ? undefined
    : optionalString(trace.data.reasoning)?.slice(
        0,
        modelReasoningCharacterLimit
      )

  return {
    id: trace._id,
    kind: "model",
    status: failed ? "failed" : "completed",
    title: failed ? "Model request failed" : "Model step completed",
    description: failed
      ? optionalString(trace.data.error)
      : modelSummary(usage),
    details: modelDetails(usage, model),
    durationMs: usage?.durationMs,
    endedAt: trace.timestamp,
    ...(reasoning === undefined ? {} : { reasoning }),
    startedAt: started?.timestamp ?? trace.timestamp,
    tokenUsage: modelTokenUsage(usage, model),
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
  usage: ModelUsage | undefined,
  model: string | undefined
): ActivityTokenUsage | undefined {
  if (usage === undefined) {
    return undefined
  }

  return {
    ...(model === undefined ? {} : { model }),
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

function modelTraceKey(trace: ModelTrace) {
  return String(trace.sequence ?? trace.timestamp)
}

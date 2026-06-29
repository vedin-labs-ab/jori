import { type Doc } from "../../_generated/dataModel"
import { projectModelTraces } from "./model"
import { readEventData, readTraceError } from "./read"
import { projectToolTraces } from "./tool"
import { type ActivityItem, type ActivityStatus } from "./types"

export function projectTraceActivity(
  traces: Doc<"traces">[],
  runStatus: Doc<"runs">["status"]
) {
  const isRunLive =
    isLiveRunStatus(runStatus) &&
    !traces.some((trace) => isTerminalRunTrace(trace))

  return [
    ...projectRunTraces(traces),
    ...projectModelTraces(traces, isRunLive),
    ...projectToolTraces(traces, isRunLive),
  ]
}

function projectRunTraces(traces: Doc<"traces">[]): ActivityItem[] {
  return traces.flatMap((trace) => {
    if (trace.type === "run.started") {
      return [traceItem(trace, "run", "running", "Run started")]
    }

    if (trace.type === "run.completed") {
      return [traceItem(trace, "run", "completed", "Run completed")]
    }

    if (trace.type === "run.failed") {
      return [
        traceItem(trace, "run", "failed", "Run failed", {
          description: readTraceError(trace.data),
        }),
      ]
    }

    if (trace.type === "run.stopped") {
      return [eventTraceItem(trace, "run")]
    }

    if (trace.type === "asset.saved") {
      return [eventTraceItem(trace, "asset")]
    }

    return []
  })
}

function isTerminalRunTrace(trace: Doc<"traces">) {
  return (
    trace.type === "run.completed" ||
    trace.type === "run.failed" ||
    trace.type === "run.stopped"
  )
}

function isLiveRunStatus(status: Doc<"runs">["status"]) {
  return status === "queued" || status === "running"
}

function traceItem(
  trace: Doc<"traces">,
  kind: ActivityItem["kind"],
  status: ActivityStatus,
  title: string,
  options: Pick<ActivityItem, "description"> = {}
): ActivityItem {
  return {
    id: trace._id,
    kind,
    status,
    title,
    ...options,
    startedAt: trace.timestamp,
  }
}

function eventTraceItem(
  trace: Doc<"traces">,
  kind: ActivityItem["kind"]
): ActivityItem {
  const event = readEventData(trace.data)

  return traceItem(
    trace,
    kind,
    event?.status ?? "completed",
    event?.title ?? kind,
    {
      description: event?.summary,
    }
  )
}

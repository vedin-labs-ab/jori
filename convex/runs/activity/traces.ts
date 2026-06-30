import { type Doc } from "../../_generated/dataModel"
import { getActorDisplayName } from "../../shared/actor"
import { projectModelTraces } from "./model"
import { readTraceError } from "./read"
import { projectToolTraces } from "./tool"
import { type ActivityItem, type ActivityStatus } from "./types"

export function projectTraceActivity(
  traces: Doc<"traces">[],
  run: Doc<"runs">
) {
  const isRunLive =
    isLiveRunStatus(run.status) &&
    !traces.some((trace) => isTerminalRunTrace(trace))

  return [
    ...projectRunTraces(traces, run),
    ...projectModelTraces(traces, isRunLive),
    ...projectToolTraces(traces, isRunLive),
  ]
}

function projectRunTraces(
  traces: Doc<"traces">[],
  run: Doc<"runs">
): ActivityItem[] {
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
      return [
        traceItem(trace, "run", "stopped", "Run stopped", {
          description: stoppedDescription(run),
        }),
      ]
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

function stoppedDescription(run: Doc<"runs">) {
  const actor = getActorDisplayName(run.stoppedBy)

  return actor === undefined ? undefined : `Stopped by ${actor}`
}

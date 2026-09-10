import { type Doc } from "../../_generated/dataModel"
import { getActorDisplayName } from "../../shared/actor"
import { optionalString } from "../../shared/input"
import { projectModelTraces } from "./model"
import { projectToolTraces } from "./tool"
import {
  type ActivityData,
  type ActivityItem,
  type ActivityStatus,
} from "./types"

export function projectTraceActivity(data: ActivityData) {
  const { run, traces } = data
  const isRunLive =
    isLiveRunStatus(run.status) &&
    !traces.some((trace) => isTerminalRunTrace(trace))

  return [
    ...projectRunTraces(traces, run),
    ...projectModelTraces(traces, isRunLive),
    ...projectToolTraces(data, isRunLive),
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
          description: optionalString(trace.data.error),
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

    if (trace.type === "transcript.compacted") {
      return [
        traceItem(trace, "model", "completed", "Condensed earlier context", {
          description: compactionDescription(trace.data.kind),
        }),
      ]
    }

    return []
  })
}

/** Quiet by design: the run kept going, and this says only how. */
function compactionDescription(kind: "cleared" | "summarized") {
  return kind === "cleared"
    ? "Cleared older tool results to make room."
    : "Summarized the earlier history to make room."
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

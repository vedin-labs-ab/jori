import { type Doc } from "../../_generated/dataModel"
import { projectModelTraces } from "./model"
import { readEventData, readTraceError } from "./read"
import { projectToolTraces } from "./tool"
import { type ActivityItem, type ActivityStatus } from "./types"

export function projectTraceActivity(traces: Doc<"traces">[]) {
  return [
    ...projectRunTraces(traces),
    ...projectModelTraces(traces),
    ...projectToolTraces(traces),
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

    if (trace.type === "asset.saved") {
      return [eventTraceItem(trace, "asset")]
    }

    return []
  })
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

import { type Doc } from "../../_generated/dataModel"
import { getActorDisplayName } from "../../shared/actor"
import { detail, uniqueDetails } from "../detail"
import { isManualTrigger, isSubtaskRun } from "./source"
import { toolDetails } from "./tools"

export function runDetails(input: {
  approval: Doc<"approvals"> | null
  run: Doc<"runs">
  stoppedBy: string | undefined
  tools: Parameters<typeof toolDetails>[0]
}) {
  // A manual run's snapshot context is the job's schedule/status and a
  // subtask's is its parent's origin; neither says anything about this run.
  const snapshotContext =
    isManualTrigger(input.run) || isSubtaskRun(input.run)
      ? []
      : input.run.snapshot.context

  return uniqueDetails([
    stoppedDetail(input.run, input.stoppedBy),
    decisionDetail(input.approval),
    ...(input.run.cause.type === "time" ? snapshotContext : []),
    ...toolDetails(input.tools),
    ...(input.run.cause.type === "time" ? [] : snapshotContext),
  ])
}

function stoppedDetail(run: Doc<"runs">, stoppedBy: string | undefined) {
  if (run.status !== "stopped") {
    return undefined
  }

  return detail("stopped", stoppedBy ?? "Stopped", {
    timestamp: run.endedAt,
  })
}

function decisionDetail(approval: Doc<"approvals"> | null) {
  if (approval?.status !== "approved") {
    return undefined
  }

  const decidedBy = getActorDisplayName(approval.decidedBy)

  return decidedBy === undefined
    ? undefined
    : detail("decision", decidedBy, { timestamp: approval.decidedAt })
}

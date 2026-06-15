import { type Doc } from "../../_generated/dataModel"
import { getActorDisplayName } from "../../shared/actor"
import { detail, uniqueDetails } from "./detail"
import { toolDetails } from "./tools"

export function executionDetailSummary(input: {
  approval: Doc<"approvals"> | null
  execution: Doc<"executions">
  run: Doc<"runs">
  stoppedBy: string | undefined
}) {
  const displayDetails = input.run.display.details

  return {
    details: uniqueDetails([
      stoppedDetail(input.execution, input.stoppedBy),
      decisionDetail(input.approval),
      ...(input.run.reason.type === "time" ? displayDetails : []),
      ...toolDetails(input.execution.toolSnapshot),
      ...(input.run.reason.type === "time" ? [] : displayDetails),
    ]),
    taskSource: input.run.display.taskSource,
  }
}

function stoppedDetail(
  execution: Doc<"executions">,
  stoppedBy: string | undefined
) {
  if (execution.status !== "stopped") {
    return undefined
  }

  return detail("stopped", stoppedBy ?? "Stopped", {
    at: execution.stoppedAt ?? execution.finishedAt,
  })
}

function decisionDetail(approval: Doc<"approvals"> | null) {
  if (approval?.decision !== "approved") {
    return undefined
  }

  const decidedBy = getActorDisplayName(approval.decidedBy)

  return decidedBy === undefined
    ? undefined
    : detail("decision", decidedBy, { at: approval.decidedAt })
}

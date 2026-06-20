import { type Doc } from "../../_generated/dataModel"
import { getActorDisplayName } from "../../shared/actor"
import { detail, uniqueDetails } from "../display/detail"
import { toolDetails } from "./tools"

export function runDetailSummary(input: {
  approval: Doc<"approvals"> | null
  run: Doc<"runs">
  stoppedBy: string | undefined
}) {
  const displayDetails = input.run.display.details

  return {
    details: uniqueDetails([
      stoppedDetail(input.run, input.stoppedBy),
      decisionDetail(input.approval),
      ...(input.run.reason.type === "time" ? displayDetails : []),
      ...toolDetails(input.run.toolSnapshot),
      ...(input.run.reason.type === "time" ? [] : displayDetails),
    ]),
    taskSource: input.run.display.taskSource,
  }
}

function stoppedDetail(run: Doc<"runs">, stoppedBy: string | undefined) {
  if (run.status !== "stopped") {
    return undefined
  }

  return detail("stopped", stoppedBy ?? "Stopped", {
    at: run.stoppedAt ?? run.finishedAt,
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

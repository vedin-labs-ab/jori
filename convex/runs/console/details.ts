import { type Doc } from "../../_generated/dataModel"
import { getActorDisplayName } from "../../shared/actor"
import { detail, uniqueDetails } from "../display/detail"
import { toolDetails } from "./tools"

export function runDetailSummary(input: {
  approval: Doc<"approvals"> | null
  run: Doc<"runs">
  stoppedBy: string | undefined
  tools: Parameters<typeof toolDetails>[0]
}) {
  const snapshotDetails = input.run.snapshot.details

  return {
    details: uniqueDetails([
      stoppedDetail(input.run, input.stoppedBy),
      decisionDetail(input.approval),
      ...(input.run.cause.type === "time" ? snapshotDetails : []),
      ...toolDetails(input.tools),
      ...(input.run.cause.type === "time" ? [] : snapshotDetails),
    ]),
    taskSource: input.run.snapshot.taskSource,
  }
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
  if (approval?.decision !== "approved") {
    return undefined
  }

  const decidedBy = getActorDisplayName(approval.decidedBy)

  return decidedBy === undefined
    ? undefined
    : detail("decision", decidedBy, { timestamp: approval.decidedAt })
}

import { type Doc } from "../../_generated/dataModel"
import { getActorDisplayName } from "../../shared/actor"
import {
  compactDetails,
  detail,
  type ExecutionDetailType,
  uniqueDetails,
} from "./detail"
import { originDetails } from "./origin"
import { type ExecutionSource } from "./source"

export function executionDetails(input: {
  approval: Doc<"approvals"> | null
  event: Doc<"events"> | null
  execution: Doc<"executions">
  integration: Doc<"integrations"> | null
  message: Doc<"messages"> | null
  source: ExecutionSource
  stoppedBy: string | undefined
}) {
  const origin = input.message ?? input.event

  return uniqueDetails([
    stoppedDetail(input.execution, input.stoppedBy),
    decisionDetail(input.approval),
    ...originDetails({
      data: origin?.data,
      integration: input.integration,
      provider: origin?.provider,
      text: origin?.text,
    }),
    ...metadataDetails(input.source.metadata),
  ])
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

function metadataDetails(metadata: ExecutionSource["metadata"]) {
  return compactDetails(
    metadata
      .filter(isRequestedMetadata)
      .map((item) => detail(item.type, item.label, { url: item.url }))
  )
}

function isRequestedMetadata(
  item: ExecutionSource["metadata"][number]
): item is ExecutionSource["metadata"][number] & {
  type: Extract<
    ExecutionDetailType,
    "channel" | "issue" | "page" | "repository"
  >
} {
  return (
    item.type === "channel" ||
    item.type === "issue" ||
    item.type === "page" ||
    item.type === "repository"
  )
}

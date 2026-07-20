import { type Doc } from "../../_generated/dataModel"
import { runAudienceScope } from "../scope"

export function canSee(current: Doc<"runs">, candidate: Doc<"runs">) {
  const scope = runAudienceScope(candidate)

  if (candidate.organizationId !== current.organizationId) {
    return false
  }

  if (scope === "organization") {
    return true
  }

  if (scope === "conversation") {
    return (
      candidate.conversationId !== undefined &&
      candidate.conversationId === current.conversationId
    )
  }

  return (
    candidate.createdBy !== undefined &&
    candidate.createdBy === current.createdBy
  )
}

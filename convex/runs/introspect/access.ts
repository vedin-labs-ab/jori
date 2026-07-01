import { type Doc } from "../../_generated/dataModel"

export function canSee(current: Doc<"runs">, candidate: Doc<"runs">) {
  const audienceScope = candidate.audienceScope ?? "person"

  if (candidate.tenantId !== current.tenantId) {
    return false
  }

  if (audienceScope === "tenant") {
    return true
  }

  if (audienceScope === "conversation") {
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

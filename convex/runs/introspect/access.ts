import { type Doc } from "../../_generated/dataModel"

export function canSee(current: Doc<"runs">, candidate: Doc<"runs">) {
  const scope = candidate.scope ?? "person"

  if (candidate.tenantId !== current.tenantId) {
    return false
  }

  if (scope === "tenant") {
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

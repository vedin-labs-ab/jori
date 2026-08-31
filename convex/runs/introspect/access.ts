import { type Doc } from "../../_generated/dataModel"

export function canSee(current: Doc<"runs">, candidate: Doc<"runs">) {
  const audience = candidate.audience

  if (candidate.organizationId !== current.organizationId) {
    return false
  }

  if (audience === "organization") {
    return true
  }

  if (audience === "conversation") {
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

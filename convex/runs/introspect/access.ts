import { type Doc } from "../../_generated/dataModel"
import { conversationGate } from "../../conversations/access"
import { type QueryLikeCtx } from "../../shared/context"
import { createSight } from "../../visibility/sight"

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

/** Agent inspection uses execution identity, never the human who sent a
 *  shared message. Only the current chat may cross its own audience boundary. */
export async function canInspectRun(
  ctx: QueryLikeCtx,
  current: Doc<"runs">,
  candidate: Doc<"runs">
) {
  if (candidate.organizationId !== current.organizationId) {
    return false
  }
  if (candidate.conversationId !== undefined) {
    const conversation = await ctx.db.get(candidate.conversationId)
    if (
      conversation === null ||
      conversation.organizationId !== current.organizationId
    ) {
      return false
    }
    if (conversation.surface === "console") {
      if (candidate.conversationId === current.conversationId) {
        return true
      }
      return await createSight(ctx, {
        organizationId: current.organizationId,
        personId:
          current.principal.kind === "person"
            ? current.principal.personId
            : undefined,
      }).canSee(conversationGate(conversation))
    }
  }
  return (
    canSee(current, candidate) &&
    (candidate.audience !== "person" || current.audience === "person")
  )
}

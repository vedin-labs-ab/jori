import { type Doc } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { createAudienceSight } from "../visibility/execution"
import { type StoredVisibility } from "../visibility/schema"
import { createSight, type Gate, type Sight } from "../visibility/sight"

/** Console visibility is explicit. Provider threads follow their own scope. */
export function conversationVisibility(
  conversation: Doc<"conversations">
): StoredVisibility {
  if (
    conversation.surface !== "console" ||
    conversation.visibility === undefined
  ) {
    throw new Error("Console conversation visibility is missing.")
  }

  return conversation.visibility
}

/** Filing and visibility are independent, with the standard owner override. */
export function conversationGate(conversation: Doc<"conversations">): Gate {
  return {
    organizationId: conversation.organizationId,
    ownerId: conversation.createdBy,
    visibility: conversationVisibility(conversation),
    folderId: conversation.folderId,
  }
}

/** A private chat reads as its owner; a shared chat reads for its audience. */
export function createConversationSight(
  ctx: QueryLikeCtx,
  conversation: Doc<"conversations">
): Sight {
  const gate = conversationGate(conversation)
  return gate.visibility.mode === "private"
    ? createSight(ctx, {
        organizationId: gate.organizationId,
        personId: gate.ownerId,
      })
    : createAudienceSight(ctx, gate)
}

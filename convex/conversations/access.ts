import { type Doc } from "../_generated/dataModel"
import { type StoredVisibility } from "../visibility/schema"
import { type Gate } from "../visibility/sight"

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

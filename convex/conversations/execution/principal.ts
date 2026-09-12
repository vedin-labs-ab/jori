import { type Doc, type Id } from "../../_generated/dataModel"
import {
  type ExecutionPrincipal,
  executionPrincipalForPerson,
  executionPrincipalForVisibility,
} from "../../runs/principal"
import { type QueryLikeCtx } from "../../shared/context"
import { audienceKey } from "../../visibility/execution"
import { conversationGate, conversationVisibility } from "../access"

export function conversationExecutionPrincipal(
  conversation: Doc<"conversations">,
  senderId?: Id<"persons">
): ExecutionPrincipal {
  return conversation.surface === "console"
    ? executionPrincipalForVisibility(
        conversationVisibility(conversation),
        conversation.createdBy
      )
    : executionPrincipalForPerson(senderId)
}

export async function conversationExecutionScope(
  ctx: QueryLikeCtx,
  conversation: Doc<"conversations">
) {
  if (conversation.surface !== "console") {
    return undefined
  }

  return conversationVisibility(conversation).mode === "private"
    ? `person:${conversation.createdBy}`
    : `audience:${await audienceKey(ctx, conversationGate(conversation))}`
}

import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import {
  type ResolvedContext,
  resolveConsoleContext,
  resolveConsoleReferences,
} from "../messages/references"
import { nameMentions } from "../references/tokens"
import {
  type ExecutionPrincipal,
  executionPrincipalForPerson,
  executionPrincipalForVisibility,
} from "../runs/principal"
import { type QueryLikeCtx } from "../shared/context"
import { audienceKey } from "../visibility/execution"
import {
  conversationGate,
  conversationVisibility,
  createConversationSight,
} from "./access"

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

/** What a console conversation was opened about, as its current audience
 *  can see it — the context rides on their first message, and
 *  the message's text with its mentions named, for the run's title.
 *  The chat's own folder determines attribution independently of context. */
export async function consoleRunDetails(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  message: Doc<"messages">
): Promise<{ context: ResolvedContext | undefined; title?: string }> {
  if (conversation.surface !== "console") {
    return { context: undefined }
  }

  const first = await ctx.db
    .query("messages")
    .withIndex(
      "by_organization_and_integration_and_conversation_and_created_at",
      (query) =>
        query
          .eq("organizationId", conversation.organizationId)
          .eq("integrationId", undefined)
          .eq("conversationId", conversation.externalId)
    )
    .order("asc")
    .first()
  const sight = createConversationSight(ctx, conversation)
  const references = await resolveConsoleReferences(ctx, sight, message.data)

  return {
    context: await resolveConsoleContext(ctx, sight, first?.data),
    ...(references.length === 0
      ? {}
      : { title: nameMentions(message.text ?? "", references) }),
  }
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

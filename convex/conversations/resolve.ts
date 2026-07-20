import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"

type ConversationKey = {
  externalId: string
  integrationId: Id<"integrations">
  organizationId: string
}

type ConversationMessage = Pick<
  Doc<"messages">,
  "conversationId" | "integrationId" | "organizationId"
>

export async function findConversation(
  ctx: QueryLikeCtx,
  args: ConversationKey
) {
  return await ctx.db
    .query("conversations")
    .withIndex("by_organization_and_integration_and_external", (query) =>
      query
        .eq("organizationId", args.organizationId)
        .eq("integrationId", args.integrationId)
        .eq("externalId", args.externalId)
    )
    .unique()
}

export async function findMessageConversation(
  ctx: QueryLikeCtx,
  message: ConversationMessage
) {
  return await findConversation(ctx, {
    organizationId: message.organizationId,
    integrationId: message.integrationId,
    externalId: message.conversationId,
  })
}

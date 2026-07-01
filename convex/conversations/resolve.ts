import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"

type ConversationCtx = QueryCtx | MutationCtx

type ConversationKey = {
  externalId: string
  integrationId: Id<"integrations">
  tenantId: string
}

type ConversationMessage = Pick<
  Doc<"messages">,
  "conversationId" | "integrationId" | "tenantId"
>

export async function findConversation(
  ctx: ConversationCtx,
  args: ConversationKey
) {
  return await ctx.db
    .query("conversations")
    .withIndex("by_tenant_and_integration_and_external", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("integrationId", args.integrationId)
        .eq("externalId", args.externalId)
    )
    .unique()
}

export async function findMessageConversation(
  ctx: ConversationCtx,
  message: ConversationMessage
) {
  return await findConversation(ctx, {
    tenantId: message.tenantId,
    integrationId: message.integrationId,
    externalId: message.conversationId,
  })
}

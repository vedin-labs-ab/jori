import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { createSight } from "../visibility/sight"
import { conversationGate } from "./access"

type ConversationKey = {
  externalId: string
  integrationId: Id<"integrations"> | undefined
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

/** Console chats use the same resource and folder gate as their contents. */
export async function findVisibleConsoleConversation(
  ctx: QueryLikeCtx,
  args: {
    conversationId: Id<"conversations">
    organizationId: string
    personId: Id<"persons"> | undefined
  }
) {
  const conversation = await ctx.db.get(args.conversationId)

  return conversation !== null &&
    conversation.organizationId === args.organizationId &&
    conversation.surface === "console" &&
    (await createSight(ctx, args).canSee(conversationGate(conversation)))
    ? conversation
    : null
}

export async function requireVisibleConsoleConversation(
  ctx: QueryLikeCtx,
  args: Parameters<typeof findVisibleConsoleConversation>[1]
) {
  const conversation = await findVisibleConsoleConversation(ctx, args)

  if (conversation === null) {
    throw new Error("Conversation not found.")
  }

  return conversation
}

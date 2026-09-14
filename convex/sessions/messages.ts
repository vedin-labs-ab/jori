import { type Doc, type Id } from "../_generated/dataModel"
import { createConversationSight } from "../conversations/access"
import { formatRuntimeMessage } from "../integrations/messages/runtime"
import { messageContextLine } from "../messages/context"
import { reactionSummariesForMessages } from "../reactions/summary"
import { type QueryLikeCtx } from "../shared/context"

/** A follow-up carries the same resolved references as the initial prompt. */
export async function formatSessionMessages(
  ctx: QueryLikeCtx,
  conversationId: Id<"conversations">,
  messages: Doc<"messages">[]
) {
  const reactions = await reactionSummariesForMessages(ctx, messages)
  const conversation = messages.some((message) => message.surface === "console")
    ? await ctx.db.get(conversationId)
    : null
  const sight =
    conversation?.surface === "console"
      ? createConversationSight(ctx, conversation)
      : undefined
  return await Promise.all(
    messages.map(async (message) => ({
      ...formatRuntimeMessage(message, reactions.get(message._id)),
      ...(sight === undefined
        ? {}
        : { context: await messageContextLine(ctx, message, sight) }),
    }))
  )
}

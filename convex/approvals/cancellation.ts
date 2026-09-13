import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { findSessionByRun } from "../sessions/read"
import { type Actor } from "../shared/actor"

export async function resolveCancellationActor(
  ctx: MutationCtx,
  args: {
    messageId: Id<"messages">
    runId: Id<"runs">
    organizationId: string
  }
): Promise<Actor | null> {
  const message = await ctx.db.get(args.messageId)

  if (
    message === null ||
    message.organizationId !== args.organizationId ||
    message.actor?.kind !== "person"
  ) {
    return null
  }

  const session = await findSessionByRun(ctx, args.runId)

  if (session === null) {
    return null
  }

  const conversation = await ctx.db.get(session.conversationId)

  if (
    conversation === null ||
    !isMessageInConversation(message, conversation)
  ) {
    return null
  }

  return message.actor
}

function isMessageInConversation(
  message: Doc<"messages">,
  conversation: Doc<"conversations">
) {
  return (
    message.organizationId === conversation.organizationId &&
    message.integrationId === conversation.integrationId &&
    message.conversationId === conversation.externalId
  )
}

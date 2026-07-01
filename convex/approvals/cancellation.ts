import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { type Actor } from "../shared/actor"

export async function resolveCancellationActor(
  ctx: MutationCtx,
  args: {
    messageId: Id<"messages">
    runId: Id<"runs">
    tenantId: string
  }
): Promise<Actor | null> {
  const message = await ctx.db.get(args.messageId)

  if (
    message === null ||
    message.tenantId !== args.tenantId ||
    message.actor?.kind !== "person"
  ) {
    return null
  }

  const session = await ctx.db
    .query("sessions")
    .withIndex("by_run", (query) => query.eq("runId", args.runId))
    .first()

  if (session === null) {
    return null
  }

  if (session.conversationId === undefined) {
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
    message.tenantId === conversation.tenantId &&
    message.integrationId === conversation.integrationId &&
    message.conversationId === conversation.externalId
  )
}

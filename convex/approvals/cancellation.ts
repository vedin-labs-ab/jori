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
    message.actor?.kind !== "user"
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

  const watch = await ctx.db.get(session.watchId)

  if (watch === null || !isMessageInWatch(message, watch)) {
    return null
  }

  return message.actor
}

function isMessageInWatch(message: Doc<"messages">, watch: Doc<"watches">) {
  return (
    message.tenantId === watch.tenantId &&
    message.integrationId === watch.integrationId &&
    message.conversationId === watch.externalId
  )
}

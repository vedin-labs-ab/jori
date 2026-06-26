import { v } from "convex/values"
import { type Doc } from "../../../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../../../_generated/server"
import { getSlackChannelId } from "../data"

export type SlackReactionSyncPlan = {
  channelId: string
  integration: Doc<"integrations">
  threadTs: string
}

export const sessionTarget = internalQuery({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<SlackReactionSyncPlan | null> => {
    const session = await ctx.db.get(args.sessionId)

    if (session?.runId === undefined) {
      return null
    }

    const watch = await ctx.db.get(session.watchId)

    if (watch === null) {
      return null
    }

    const integration = await ctx.db.get(watch.integrationId)

    if (
      integration?.integration !== "slack" ||
      integration.status !== "active"
    ) {
      return null
    }

    const channelId = await conversationChannelId(ctx, { integration, watch })

    return channelId === null
      ? null
      : {
          channelId,
          integration,
          threadTs: watch.externalId,
        }
  },
})

async function conversationChannelId(
  ctx: QueryCtx,
  args: {
    integration: Doc<"integrations">
    watch: Doc<"watches">
  }
) {
  const message = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (query) =>
      query
        .eq("tenantId", args.watch.tenantId)
        .eq("integrationId", args.integration._id)
        .eq("conversationId", args.watch.externalId)
    )
    .order("desc")
    .first()

  return message === null ? null : (getSlackChannelId(message.data) ?? null)
}

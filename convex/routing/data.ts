import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { readProviderDataString } from "../providers/data"

export const routingReplyClaimMs = 2 * 60 * 1000

export async function activeSlackIntegration(
  ctx: QueryCtx,
  integrationId: Id<"integrations">
) {
  const integration = await ctx.db.get(integrationId)

  return integration?.integration === "slack" && integration.status === "active"
    ? integration
    : null
}

export async function findRoutingByMessage(
  ctx: QueryCtx,
  messageId: Id<"messages">
) {
  return await ctx.db
    .query("routing")
    .withIndex("by_message", (query) => query.eq("messageId", messageId))
    .first()
}

export function slackReplyTarget(message: Doc<"messages">) {
  const channelId = readProviderDataString(message.data, "channelId")
  const messageTs = readProviderDataString(message.data, "ts")

  if (channelId === undefined || messageTs === undefined) {
    return null
  }

  return {
    channelId,
    threadTs: readProviderDataString(message.data, "threadTs") ?? messageTs,
  }
}

export function hasActiveClaim(claimUntil: number | undefined, now: number) {
  return claimUntil !== undefined && claimUntil > now
}

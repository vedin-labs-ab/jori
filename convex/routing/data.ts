import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"

export async function activeMessageIntegration(
  ctx: QueryCtx,
  message: Doc<"messages">
) {
  const integration = await ctx.db.get(message.integrationId)

  return integration?.integration === message.integration &&
    integration.status === "active"
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

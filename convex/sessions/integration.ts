import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { type Integration } from "../shared/integrations"
export async function activeSessionIntegration(
  ctx: QueryCtx,
  args: {
    sessionId: Id<"sessions">
    integration: Integration
  }
): Promise<{
  conversation: Doc<"conversations">
  integration: Doc<"integrations">
} | null> {
  const session = await ctx.db.get(args.sessionId)

  if (session?.runId === undefined || session.conversationId === undefined) {
    return null
  }

  const conversation = await ctx.db.get(session.conversationId)

  if (conversation === null) {
    return null
  }

  const integration = await ctx.db.get(conversation.integrationId)

  if (
    integration?.integration !== args.integration ||
    integration.status !== "active"
  ) {
    return null
  }

  return { conversation, integration }
}

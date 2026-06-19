import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../_generated/server"
import { activeMessageIntegration } from "./data"
import { messageEntry, recentConversation } from "./history"
import { type MessageAudience, messageAudience } from "./surface"

export const getMessageContext = internalQuery({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)

    if (message === null) {
      return null
    }

    const integration = await activeMessageIntegration(ctx, message)

    if (integration === null) {
      return null
    }

    const active = await getActiveExecution(ctx, {
      integration,
      message,
    })

    const audience = messageAudience(message, integration)

    return {
      activeExecution: active,
      currentMessage: messageEntry(message),
      integration: message.integration,
      isAddressed: audience.isAddressed,
      isDirect: audience.isDirect,
      recentMessages: await recentConversation(ctx, message),
    }
  },
})

async function getActiveExecution(
  ctx: QueryCtx,
  input: {
    integration: Doc<"integrations">
    message: Doc<"messages">
  }
) {
  const conversationId = input.message.conversationId

  if (conversationId === undefined) {
    return null
  }

  const conversation = await ctx.db
    .query("conversations")
    .withIndex("by_conversation", (query) =>
      query
        .eq("tenantId", input.integration.tenantId)
        .eq("integrationId", input.integration._id)
        .eq("conversationId", conversationId)
    )
    .first()

  if (conversation === null) {
    return null
  }

  const session = await ctx.db
    .query("sessions")
    .withIndex("by_conversation", (query) =>
      query.eq("conversationId", conversation._id)
    )
    .first()

  if (session === null || session.state !== "active") {
    return null
  }

  const execution =
    session.executionId === undefined
      ? null
      : await ctx.db.get(session.executionId)

  if (execution === null || isTerminalExecution(execution)) {
    return null
  }

  const event = await ctx.db
    .query("runtimeEvents")
    .withIndex("by_run", (query) => query.eq("runId", execution.runId))
    .order("desc")
    .first()

  return {
    executionId: execution._id,
    latestStatus: event?.type ?? null,
    runId: execution.runId,
    status: execution.status,
  }
}

function isTerminalExecution(execution: Doc<"executions">) {
  return (
    execution.status === "completed" ||
    execution.status === "failed" ||
    execution.status === "stopped"
  )
}

export type MessageRoutingContext = {
  activeExecution: {
    executionId: Doc<"executions">["_id"]
    latestStatus: string | null
    runId: Doc<"runs">["_id"]
    status: string
  } | null
  currentMessage: ReturnType<typeof messageEntry>
  integration: Doc<"messages">["integration"]
  isAddressed: MessageAudience["isAddressed"]
  isDirect: MessageAudience["isDirect"]
  recentMessages: Awaited<ReturnType<typeof recentConversation>>
}

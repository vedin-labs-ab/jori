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

    const audience = messageAudience(message, integration)
    const [active, recentMessages] = await Promise.all([
      getActiveRun(ctx, {
        integration,
        message,
      }),
      recentConversation(ctx, message, integration),
    ])

    return {
      activeRun: active,
      currentMessage: messageEntry(message, integration),
      integration: message.integration,
      isAddressed: audience.isAddressed,
      isDirect: audience.isDirect,
      recentMessages,
    }
  },
})

async function getActiveRun(
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

  if (session?.runId === undefined) {
    return null
  }

  const run = await ctx.db.get(session.runId)

  if (run === null || isTerminalRun(run)) {
    return null
  }

  const trace = await ctx.db
    .query("traces")
    .withIndex("by_run_and_timestamp", (query) => query.eq("runId", run._id))
    .order("desc")
    .first()

  return {
    latestStatus: trace?.type ?? null,
    runId: run._id,
    status: run.status,
  }
}

function isTerminalRun(run: Doc<"runs">) {
  return (
    run.status === "completed" ||
    run.status === "failed" ||
    run.status === "stopped"
  )
}

export type MessageRoutingContext = {
  activeRun: {
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

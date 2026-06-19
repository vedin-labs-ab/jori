import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../_generated/server"
import { getSlackBotId, getSlackChannelType } from "../providers/slack/data"
import { recentConversation, slackMessageEntry } from "./history"

export const getSlackContext = internalQuery({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)

    if (message === null || message.integration !== "slack") {
      return null
    }

    const integration = await ctx.db.get(message.integrationId)

    if (
      integration === null ||
      integration.status !== "active" ||
      integration.integration !== "slack"
    ) {
      return null
    }

    const active = await getActiveExecution(ctx, {
      integration,
      message,
    })

    return {
      activeExecution: active,
      currentMessage: slackMessageEntry(message),
      isDirectMessage: isDirectSlackMessage(message),
      isMention: isSlackMention(message, integration),
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

function isDirectSlackMessage(message: Doc<"messages">) {
  return (
    message.type === "message.im" || getSlackChannelType(message.data) === "im"
  )
}

function isSlackMention(
  message: Doc<"messages">,
  integration: Doc<"integrations">
) {
  if (message.type === "app_mention") {
    return true
  }

  const botId = getSlackBotId(integration.data)

  return botId !== undefined && (message.text ?? "").includes(`<@${botId}>`)
}

function isTerminalExecution(execution: Doc<"executions">) {
  return (
    execution.status === "completed" ||
    execution.status === "failed" ||
    execution.status === "stopped"
  )
}

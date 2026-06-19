"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx, internalAction } from "../_generated/server"
import { postSlackMessage } from "../broker/tools/slack"
import { readProviderDataString } from "../providers/data"
import {
  decideRoute,
  formatRoutingError,
  type SlackRoutingContext,
} from "./decision"

type SlackReplyTarget = {
  channelId: string
  integration: Doc<"integrations">
  routingId: Id<"routing">
  text: string
  threadTs: string
}

export const route = internalAction({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = (await ctx.runQuery(
      internal.routing.context.getSlackContext,
      { messageId: args.messageId }
    )) as SlackRoutingContext | null

    if (context === null) {
      return null
    }

    const decision = await decideRoute(context)
    const result = await ctx.runMutation(
      internal.routing.records.applySlackDecision,
      { decision, messageId: args.messageId, now: Date.now() }
    )
    const reply = readReplyTarget(result)

    if (reply !== null) {
      await deliverReply(ctx, reply)
    }

    return null
  },
})

async function deliverReply(ctx: ActionCtx, reply: SlackReplyTarget) {
  try {
    const result = await postSlackMessage(reply.integration, {
      channel: reply.channelId,
      text: reply.text,
      thread_ts: reply.threadTs,
    })
    const messageTs = readProviderDataString(result, "ts")

    if (messageTs === undefined) {
      throw new Error("Slack intake reply response is missing ts")
    }

    await ctx.runMutation(internal.routing.replies.recordSlackReply, {
      messageTs,
      routingId: reply.routingId,
    })
  } catch (error) {
    await ctx.runMutation(internal.routing.replies.recordSlackReplyFailure, {
      error: formatRoutingError(error),
      routingId: reply.routingId,
    })
  }
}

function readReplyTarget(value: unknown): SlackReplyTarget | null {
  if (typeof value !== "object" || value === null || !("reply" in value)) {
    return null
  }

  const reply = (value as { reply?: unknown }).reply

  if (typeof reply !== "object" || reply === null) {
    return null
  }

  return reply as SlackReplyTarget
}

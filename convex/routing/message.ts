"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"
import { type MessageRoutingContext } from "./context"
import { decideRoute } from "./decision"
import { deliverTextReply } from "./delivery"
import { type TextReplyTarget } from "./surface"

export const route = internalAction({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = (await ctx.runQuery(
      internal.routing.context.getMessageContext,
      { messageId: args.messageId }
    )) as MessageRoutingContext | null

    if (context === null) {
      return null
    }

    const decision = await decideRoute(context)
    const result = await ctx.runMutation(
      internal.routing.records.applyDecision,
      {
        decision,
        messageId: args.messageId,
        now: Date.now(),
      }
    )
    const reply = readTextReplyTarget(result)

    if (reply !== null) {
      await deliverTextReply(ctx, reply)
    }

    return null
  },
})

function readTextReplyTarget(value: unknown): TextReplyTarget | null {
  if (typeof value !== "object" || value === null || !("reply" in value)) {
    return null
  }

  const reply = (value as { reply?: unknown }).reply

  if (typeof reply !== "object" || reply === null) {
    return null
  }

  return reply as TextReplyTarget
}

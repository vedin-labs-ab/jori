"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"
import { type MessageRoutingContext } from "./context"
import { decideRoute } from "./decision"

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
    await ctx.runMutation(internal.routing.records.applyDecision, {
      decision,
      messageId: args.messageId,
      now: Date.now(),
    })

    return null
  },
})

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { action } from "../_generated/server"
import { deliverFinalReply } from "../routing/delivery"
import { type ReplyTarget } from "../routing/surface"
import { requireWorkerSecret } from "./shared"

export const deliverFinal = action({
  args: {
    content: v.string(),
    runId: v.id("runs"),
    secret: v.string(),
  },
  returns: v.object({
    delivered: v.boolean(),
  }),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    if (args.content.trim() === "") {
      return { delivered: false }
    }

    const target = (await ctx.runMutation(
      internal.routing.replies.claimFinalReply,
      { runId: args.runId, now: Date.now() }
    )) as ReplyTarget | null

    if (target === null) {
      return { delivered: false }
    }

    return await deliverFinalReply(ctx, args.content, target)
  },
})

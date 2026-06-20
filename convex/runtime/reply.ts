import { v } from "convex/values"
import { internal } from "../_generated/api"
import { action } from "../_generated/server"
import { requireWorkerSecret } from "./shared"

export const deliverFinal = action({
  args: {
    content: v.string(),
    runId: v.id("runs"),
    secret: v.string(),
  },
  returns: v.object({
    queued: v.boolean(),
  }),
  handler: async (ctx, args): Promise<{ queued: boolean }> => {
    requireWorkerSecret(args.secret)

    if (args.content.trim() === "") {
      return { queued: false }
    }

    const outboxId: unknown = await ctx.runMutation(
      internal.runtime.replies.queue.enqueueFinalReply,
      {
        content: args.content,
        runId: args.runId,
      }
    )

    return { queued: outboxId !== null }
  },
})

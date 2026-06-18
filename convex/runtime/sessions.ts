import { v } from "convex/values"
import { internal } from "../_generated/api"
import { mutation } from "../_generated/server"
import { requireWorkerSecret } from "./shared"

export const drain = mutation({
  args: {
    limit: v.optional(v.number()),
    secret: v.string(),
    sessionId: v.id("sessions"),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<unknown> => {
    requireWorkerSecret(args.secret)

    return await ctx.runMutation(internal.sessions.data.drainMessages, {
      limit: args.limit,
      sessionId: args.sessionId,
    })
  },
})

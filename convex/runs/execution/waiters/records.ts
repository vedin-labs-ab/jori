import { v } from "convex/values"
import { internalQuery } from "../../../_generated/server"

export const get = internalQuery({
  args: {
    waiterId: v.id("waiters"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.waiterId)
  },
})

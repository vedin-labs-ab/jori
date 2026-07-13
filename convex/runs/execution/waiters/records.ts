import { v } from "convex/values"
import { internalQuery } from "../../../_generated/server"
import { getWaiter } from "./data"

export const get = internalQuery({
  args: {
    waiterId: v.id("waiters"),
  },
  handler: async (ctx, args) => {
    return await getWaiter(ctx, args.waiterId)
  },
})

import { v } from "convex/values"
import { internalMutation } from "../_generated/server"

export const markExpired = internalMutation({
  args: {
    integrationId: v.id("integrations"),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (integration === null || integration.status !== "active") {
      return
    }

    await ctx.db.patch(args.integrationId, {
      status: "expired",
      updatedAt: Date.now(),
    })
  },
})

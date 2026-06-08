import { v } from "convex/values"
import { query } from "../_generated/server"
import { getSlackTeamName } from "../providers/slack/data"

export const getSlackStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      return null
    }

    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_tenant_provider", (query) =>
        query.eq("tenantId", args.tenantId).eq("provider", "slack")
      )
      .order("desc")
      .first()

    if (integration === null) {
      return null
    }

    return {
      accountId: integration.accountId,
      status: integration.status,
      createdAt: integration.createdAt,
      teamName: getSlackTeamName(integration.data),
    }
  },
})

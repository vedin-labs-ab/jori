import { v } from "convex/values"
import { internalQuery } from "../_generated/server"
import { integrationValidator } from "../shared/integrations"

export const getDecisionTarget = internalQuery({
  args: {
    accountId: v.string(),
    code: v.string(),
    integration: integrationValidator,
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_integration_and_external", (query) =>
        query
          .eq("integration", args.integration)
          .eq("externalId", args.accountId)
      )
      .first()

    if (integration === null || integration.status !== "active") {
      return null
    }

    const approval = await ctx.db
      .query("approvals")
      .withIndex("by_tenant_and_code", (query) =>
        query.eq("tenantId", integration.tenantId).eq("code", args.code)
      )
      .first()

    return { integration, approval }
  },
})

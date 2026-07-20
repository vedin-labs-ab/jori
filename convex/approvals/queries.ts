import { v } from "convex/values"
import { internalQuery } from "../_generated/server"
import { findActiveIntegrationByExternalId } from "../integrations/data"
import { integrationValidator } from "../shared/integrations"

export const getDecisionTarget = internalQuery({
  args: {
    accountId: v.string(),
    code: v.string(),
    integration: integrationValidator,
  },
  handler: async (ctx, args) => {
    const integration = await findActiveIntegrationByExternalId(ctx, {
      externalId: args.accountId,
      integration: args.integration,
    })

    if (integration === null) {
      return null
    }

    const approval = await ctx.db
      .query("approvals")
      .withIndex("by_organization_and_code", (query) =>
        query
          .eq("organizationId", integration.organizationId)
          .eq("code", args.code)
      )
      .first()

    return { integration, approval }
  },
})

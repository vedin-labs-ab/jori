import { v } from "convex/values"
import { internalQuery } from "../_generated/server"
import { integrationValidator } from "../shared/integrations"

export const activeByIntegrationExternal = internalQuery({
  args: {
    integration: integrationValidator,
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_integration_and_external", (query) =>
        query
          .eq("integration", args.integration)
          .eq("externalId", args.externalId)
      )
      .first()

    if (integration === null || integration.status !== "active") {
      return null
    }

    return integration
  },
})

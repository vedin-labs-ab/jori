import { v } from "convex/values"
import { internalQuery } from "../_generated/server"
import { integrationProviderValidator } from "../providers/catalog"

export const activeByProviderExternal = internalQuery({
  args: {
    provider: integrationProviderValidator,
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_provider_and_external", (query) =>
        query.eq("provider", args.provider).eq("externalId", args.externalId)
      )
      .first()

    if (integration === null || integration.status !== "active") {
      return null
    }

    return integration
  },
})

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

export const listActiveForRuntime = internalQuery({
  args: {
    tenantId: v.string(),
    ownerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integrations = await ctx.db
      .query("integrations")
      .withIndex("by_tenant_and_status", (query) =>
        query.eq("tenantId", args.tenantId).eq("status", "active")
      )
      .collect()

    return integrations.filter((integration) => {
      if (integration.scope !== "user") {
        return true
      }

      return args.ownerId !== undefined && integration.ownerId === args.ownerId
    })
  },
})

import { v } from "convex/values"
import { mutation } from "../_generated/server"
import { requireClerkUserId } from "../identity/users"
import {
  type IntegrationProvider,
  integrationProviderValidator,
} from "../providers/catalog"
import { requireTenantAccess } from "../skills/access"
import { getTenantIntegration, getUserIntegrationForOwner } from "./data"

export const disconnect = mutation({
  args: {
    provider: integrationProviderValidator,
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const userId = requireClerkUserId(identity)
    const integration = isUserScopedProvider(args.provider)
      ? await getUserIntegrationForOwner(ctx, {
          ownerId: userId,
          provider: args.provider,
          tenantId: args.tenantId,
        })
      : await getTenantIntegration(ctx, {
          provider: args.provider,
          tenantId: args.tenantId,
        })

    if (integration === null) {
      return null
    }

    await ctx.db.patch(integration._id, {
      status: "revoked",
    })

    return integration._id
  },
})

function isUserScopedProvider(provider: IntegrationProvider) {
  return (
    provider === "gmail" ||
    provider === "googleCalendar" ||
    provider === "microsoftCalendar" ||
    provider === "microsoftEmail"
  )
}

import { v } from "convex/values"
import { mutation } from "../_generated/server"
import { requireClerkUserId } from "../identity/users"
import { requireTenantAccess } from "../skills/access"
import { getTenantIntegration, getUserIntegrationForOwner } from "./data"

const integrationProvider = v.union(
  v.literal("github"),
  v.literal("gmail"),
  v.literal("googleCalendar"),
  v.literal("linear"),
  v.literal("microsoftCalendar"),
  v.literal("microsoftEmail"),
  v.literal("notion"),
  v.literal("slack")
)

type IntegrationProvider =
  | "github"
  | "gmail"
  | "googleCalendar"
  | "linear"
  | "microsoftCalendar"
  | "microsoftEmail"
  | "notion"
  | "slack"

export const disconnect = mutation({
  args: {
    provider: integrationProvider,
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

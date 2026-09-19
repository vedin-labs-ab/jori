import { v } from "convex/values"
import { query } from "../../_generated/server"
import { requireOrganizationAccess } from "../../access"
import { getAccount } from "../account"
import { isPolarConfigured } from "../polar/config"
import { storageConfigured } from "./config"

export const overview = query({
  args: { organizationId: v.string() },
  returns: v.object({
    extraGb: v.number(),
    pendingGb: v.optional(v.number()),
    renewsAt: v.optional(v.number()),
    canPurchase: v.boolean(),
    hasSubscription: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    const account = await getAccount(ctx, args.organizationId)
    return {
      extraGb: account?.storage?.extraGb ?? 0,
      pendingGb: account?.storage?.pendingGb,
      renewsAt: account?.storage?.renewsAt,
      canPurchase:
        isPolarConfigured() &&
        storageConfigured() &&
        account?.state.kind === "active" &&
        account.refundHold === undefined,
      hasSubscription: account?.storage !== undefined,
    }
  },
})

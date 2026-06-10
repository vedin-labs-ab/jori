import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import { upsertIdentity } from "./identities"

const verifiedClerkEmailValidator = v.object({
  externalId: v.string(),
  email: v.string(),
})

export const syncVerifiedEmails = internalMutation({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    emails: v.array(verifiedClerkEmailValidator),
  },
  handler: async (ctx, args) => {
    const syncedExternalIds = new Set(
      args.emails.map((email) => email.externalId)
    )
    const existing = await ctx.db
      .query("identities")
      .withIndex("by_tenant_provider_user", (query) =>
        query
          .eq("tenantId", args.tenantId)
          .eq("provider", "clerk")
          .eq("userId", args.userId)
      )
      .collect()

    for (const identity of existing) {
      if (!syncedExternalIds.has(identity.externalId)) {
        await ctx.db.delete(identity._id)
      }
    }

    for (const email of args.emails) {
      await upsertIdentity(ctx, {
        tenantId: args.tenantId,
        userId: args.userId,
        provider: "clerk",
        externalId: email.externalId,
        email: email.email,
      })
    }

    return { synced: args.emails.length }
  },
})

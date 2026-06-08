import { v } from "convex/values"
import { internalMutation, mutation } from "../../_generated/server"
import { createSignedSlackState } from "./signing"

export const createInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error("Unauthorized")
    }

    return await createSignedSlackState({
      tenantId: args.tenantId,
      createdBy: identity.subject,
      returnUrl: args.returnUrl,
      createdAt: Date.now(),
    })
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    tenantId: v.string(),
    createdBy: v.string(),
    accountId: v.string(),
    tokenId: v.string(),
    teamName: v.optional(v.string()),
    botUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_provider_account", (query) =>
        query.eq("provider", "slack").eq("accountId", args.accountId)
      )
      .first()

    const data = {
      teamName: args.teamName,
      botUserId: args.botUserId,
    }

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        tenantId: args.tenantId,
        tokenId: args.tokenId,
        status: "active",
        createdBy: args.createdBy,
        data,
      })

      return existing._id
    }

    return await ctx.db.insert("integrations", {
      tenantId: args.tenantId,
      provider: "slack",
      accountId: args.accountId,
      tokenId: args.tokenId,
      status: "active",
      createdBy: args.createdBy,
      createdAt: now,
      data,
    })
  },
})

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
    externalAccountId: v.string(),
    botScopes: v.optional(v.string()),
    botToken: v.string(),
    teamName: v.optional(v.string()),
    botUserId: v.optional(v.string()),
    userScopes: v.optional(v.string()),
    userToken: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_provider_external_account", (query) =>
        query
          .eq("provider", "slack")
          .eq("externalAccountId", args.externalAccountId)
      )
      .first()

    const credentials = {
      botToken: args.botToken,
      userToken: args.userToken,
    }

    const data = {
      teamName: args.teamName,
      botUserId: args.botUserId,
      botScopes: args.botScopes,
      userScopes: args.userScopes,
    }

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        tenantId: args.tenantId,
        credentials,
        status: "active",
        createdBy: args.createdBy,
        data,
      })

      return existing._id
    }

    return await ctx.db.insert("integrations", {
      tenantId: args.tenantId,
      provider: "slack",
      externalAccountId: args.externalAccountId,
      credentials,
      status: "active",
      createdBy: args.createdBy,
      createdAt: now,
      data,
    })
  },
})

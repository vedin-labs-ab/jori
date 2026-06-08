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
    botScopes: v.optional(v.string()),
    botToken: v.string(),
    team: v.object({
      id: v.string(),
      name: v.optional(v.string()),
    }),
    botId: v.optional(v.string()),
    userScopes: v.optional(v.string()),
    userToken: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_provider_account", (query) =>
        query.eq("provider", "slack").eq("accountId", args.accountId)
      )
      .first()

    const credentials = {
      bot: args.botToken,
      user: args.userToken,
    }

    const data = {
      scopes: {
        bot: args.botScopes,
        user: args.userScopes,
      },
      team: args.team,
      botId: args.botId,
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
      accountId: args.accountId,
      credentials,
      status: "active",
      createdBy: args.createdBy,
      createdAt: now,
      data,
    })
  },
})

import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  mutation,
} from "../../_generated/server"
import { requireClerkUserId } from "../../identity/users"
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
      createdBy: requireClerkUserId(identity),
      returnUrl: args.returnUrl,
      createdAt: Date.now(),
    })
  },
})

export const getUserToken = internalQuery({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_provider_account", (query) =>
        query.eq("provider", "slack").eq("accountId", args.accountId)
      )
      .first()

    if (integration === null || integration.status !== "active") {
      return null
    }

    const credentials = integration.credentials

    if (
      typeof credentials === "object" &&
      credentials !== null &&
      "user" in credentials &&
      typeof credentials.user === "string"
    ) {
      return credentials.user
    }

    return null
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

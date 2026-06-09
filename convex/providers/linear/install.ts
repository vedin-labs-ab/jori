import { v } from "convex/values"
import { internalMutation, mutation } from "../../_generated/server"
import { requireClerkUserId } from "../../identity/users"
import { createSignedLinearState } from "./signing"

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

    return await createSignedLinearState({
      tenantId: args.tenantId,
      createdBy: requireClerkUserId(identity),
      returnUrl: args.returnUrl,
      createdAt: Date.now(),
    })
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    tenantId: v.string(),
    createdBy: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
    profile: v.object({
      appUserId: v.string(),
      appUserName: v.optional(v.string()),
      organization: v.object({
        id: v.string(),
        name: v.optional(v.string()),
        urlKey: v.optional(v.string()),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_provider_account", (query) =>
        query
          .eq("provider", "linear")
          .eq("accountId", args.profile.organization.id)
      )
      .first()

    const credentials = {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
    }
    const data = {
      appUserId: args.profile.appUserId,
      appUserName: args.profile.appUserName,
      organization: args.profile.organization,
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
      provider: "linear",
      accountId: args.profile.organization.id,
      credentials,
      status: "active",
      createdBy: args.createdBy,
      createdAt: now,
      data,
    })
  },
})

export const updateOAuthCredentials = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (integration === null || integration.provider !== "linear") {
      throw new Error("Linear integration not found")
    }

    const credentials = {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
    }

    await ctx.db.patch(args.integrationId, { credentials })

    return credentials
  },
})

import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  mutation,
} from "../../_generated/server"
import { createSignedGoogleState } from "./signing"

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

    return await createSignedGoogleState({
      tenantId: args.tenantId,
      createdBy: identity.tokenIdentifier,
      returnUrl: args.returnUrl,
      createdAt: Date.now(),
    })
  },
})

export const getActiveByTenant = internalQuery({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_tenant_provider", (query) =>
        query.eq("tenantId", args.tenantId).eq("provider", "google")
      )
      .order("desc")
      .first()

    if (integration === null || integration.status !== "active") {
      return null
    }

    return integration
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    tenantId: v.string(),
    createdBy: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
    profile: v.object({
      email: v.string(),
      name: v.optional(v.string()),
      picture: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_provider_account", (query) =>
        query.eq("provider", "google").eq("accountId", args.profile.email)
      )
      .first()

    const existingRefreshToken = readRefreshToken(existing?.credentials)
    const refreshToken = args.refreshToken ?? existingRefreshToken

    if (refreshToken === undefined) {
      throw new Error("Google OAuth did not return a refresh token")
    }

    const credentials = {
      accessToken: args.accessToken,
      refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
    }
    const data = {
      profile: args.profile,
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
      provider: "google",
      accountId: args.profile.email,
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
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (integration === null || integration.provider !== "google") {
      throw new Error("Google Workspace integration not found")
    }

    const existingRefreshToken = readRefreshToken(integration.credentials)
    const refreshToken = args.refreshToken ?? existingRefreshToken

    if (refreshToken === undefined) {
      throw new Error("Google Workspace refresh token not found")
    }

    const credentials = {
      accessToken: args.accessToken,
      refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
    }

    await ctx.db.patch(args.integrationId, { credentials })

    return credentials
  },
})

function readRefreshToken(credentials: unknown) {
  if (
    typeof credentials === "object" &&
    credentials !== null &&
    "refreshToken" in credentials &&
    typeof credentials.refreshToken === "string"
  ) {
    return credentials.refreshToken
  }

  return undefined
}

import { v } from "convex/values"
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from "../../_generated/server"
import { upsertIdentity } from "../../identity/identities"
import { requireClerkUserId } from "../../identity/users"
import { type GoogleSurfaceProvider } from "./config"
import { createSignedGoogleState } from "./signing"

const googleProvider = v.union(v.literal("gmail"), v.literal("googleCalendar"))

export const createGmailInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createInstallState(ctx, "gmail", args)
  },
})

export const createGoogleCalendarInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createInstallState(ctx, "googleCalendar", args)
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    provider: googleProvider,
    tenantId: v.string(),
    createdByUserId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
    profile: v.object({
      id: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
      picture: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_tenant_provider_owner", (query) =>
        query
          .eq("tenantId", args.tenantId)
          .eq("provider", args.provider)
          .eq("ownerId", args.createdByUserId)
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
        scope: "user",
        ownerId: args.createdByUserId,
        accountId: args.profile.email,
        credentials,
        status: "active",
        createdByUserId: args.createdByUserId,
        data,
      })

      await upsertGoogleIdentity(ctx, args)

      return existing._id
    }

    const integrationId = await ctx.db.insert("integrations", {
      tenantId: args.tenantId,
      provider: args.provider,
      scope: "user",
      ownerId: args.createdByUserId,
      accountId: args.profile.email,
      credentials,
      status: "active",
      createdByUserId: args.createdByUserId,
      createdAt: now,
      data,
    })

    await upsertGoogleIdentity(ctx, args)

    return integrationId
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

    if (
      integration === null ||
      (integration.provider !== "gmail" &&
        integration.provider !== "googleCalendar")
    ) {
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

async function createInstallState(
  ctx: MutationCtx,
  provider: GoogleSurfaceProvider,
  args: {
    tenantId: string
    returnUrl: string
  }
) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw new Error("Unauthorized")
  }

  return await createSignedGoogleState({
    provider,
    tenantId: args.tenantId,
    createdByUserId: requireClerkUserId(identity),
    returnUrl: args.returnUrl,
    createdAt: Date.now(),
  })
}

async function upsertGoogleIdentity(
  ctx: MutationCtx,
  args: {
    tenantId: string
    createdByUserId: string
    profile: {
      id: string
      email: string
    }
  }
) {
  await upsertIdentity(ctx, {
    tenantId: args.tenantId,
    userId: args.createdByUserId,
    provider: "google",
    accountId: args.profile.email,
    externalId: args.profile.id,
    email: args.profile.email,
  })
}

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

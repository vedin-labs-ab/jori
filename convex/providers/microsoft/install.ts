import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from "../../_generated/server"
import { requireClerkUserId } from "../../identity/users"
import { type MicrosoftSurfaceProvider } from "./config"
import {
  getMicrosoftAccountId,
  getMicrosoftIdentityEmail,
  upsertMicrosoftIdentity,
} from "./identity"
import { createSignedMicrosoftState } from "./signing"

const microsoftProvider = v.union(
  v.literal("microsoftCalendar"),
  v.literal("microsoftEmail")
)

export const createMicrosoftEmailInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createInstallState(ctx, "microsoftEmail", args)
  },
})

export const createMicrosoftCalendarInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createInstallState(ctx, "microsoftCalendar", args)
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    provider: microsoftProvider,
    tenantId: v.string(),
    createdByUserId: v.string(),
    microsoftTenantId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
    profile: v.object({
      user: v.object({
        id: v.string(),
        displayName: v.optional(v.string()),
        userPrincipalName: v.optional(v.string()),
        mail: v.optional(v.string()),
      }),
      tenant: v.object({
        id: v.string(),
        displayName: v.optional(v.string()),
      }),
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
      throw new Error("Microsoft OAuth did not return a refresh token")
    }

    const credentials = {
      accessToken: args.accessToken,
      refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
      tenantId: args.microsoftTenantId,
    }
    const accountId = getMicrosoftAccountId(args.profile)
    const email = getMicrosoftIdentityEmail(args.profile)
    const data = {
      profile: args.profile,
      scopes: args.scope,
      tenant: args.profile.tenant,
      user: args.profile.user,
    }
    const integrationId = await upsertMicrosoftIntegration(ctx, {
      existing,
      now,
      tenantId: args.tenantId,
      provider: args.provider,
      ownerId: args.createdByUserId,
      accountId,
      credentials,
      data,
    })

    await upsertMicrosoftIdentity(ctx, {
      tenantId: args.tenantId,
      userId: args.createdByUserId,
      microsoftTenantId: args.microsoftTenantId,
      email,
      profile: args.profile,
    })

    return integrationId
  },
})

async function upsertMicrosoftIntegration(
  ctx: MutationCtx,
  args: {
    existing: Doc<"integrations"> | null
    now: number
    tenantId: string
    provider: MicrosoftSurfaceProvider
    ownerId: string
    accountId: string
    credentials: {
      accessToken: string
      refreshToken: string
      expiresAt: number
      scope: string | undefined
      tenantId: string
    }
    data: {
      profile: unknown
      scopes: string | undefined
      tenant: unknown
      user: unknown
    }
  }
): Promise<Id<"integrations">> {
  const values = {
    tenantId: args.tenantId,
    provider: args.provider,
    scope: "user" as const,
    ownerId: args.ownerId,
    accountId: args.accountId,
    credentials: args.credentials,
    status: "active" as const,
    createdByUserId: args.ownerId,
    data: args.data,
  }

  if (args.existing !== null) {
    await ctx.db.patch(args.existing._id, values)

    return args.existing._id
  }

  return await ctx.db.insert("integrations", {
    ...values,
    createdAt: args.now,
  })
}

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
      (integration.provider !== "microsoftCalendar" &&
        integration.provider !== "microsoftEmail")
    ) {
      throw new Error("Microsoft integration not found")
    }

    const existingRefreshToken = readRefreshToken(integration.credentials)
    const refreshToken = args.refreshToken ?? existingRefreshToken
    const tenantId = readTenantId(integration.credentials)

    if (refreshToken === undefined) {
      throw new Error("Microsoft refresh token not found")
    }

    if (tenantId === undefined) {
      throw new Error("Microsoft tenant ID not found")
    }

    const credentials = {
      accessToken: args.accessToken,
      refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
      tenantId,
    }

    await ctx.db.patch(args.integrationId, { credentials })

    return credentials
  },
})

async function createInstallState(
  ctx: MutationCtx,
  provider: MicrosoftSurfaceProvider,
  args: {
    tenantId: string
    returnUrl: string
  }
) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw new Error("Unauthorized")
  }

  return await createSignedMicrosoftState({
    provider,
    tenantId: args.tenantId,
    createdByUserId: requireClerkUserId(identity),
    returnUrl: args.returnUrl,
    createdAt: Date.now(),
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

function readTenantId(credentials: unknown) {
  if (
    typeof credentials === "object" &&
    credentials !== null &&
    "tenantId" in credentials &&
    typeof credentials.tenantId === "string"
  ) {
    return credentials.tenantId
  }

  return undefined
}

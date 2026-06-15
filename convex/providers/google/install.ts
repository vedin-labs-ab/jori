import { v } from "convex/values"
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from "../../_generated/server"
import { upsertIdentity } from "../../identity/identities"
import { readRefreshToken } from "../credentials"
import { buildInstallState } from "../install"
import { type GoogleIntegration } from "./config"
import {
  findExistingGoogleIntegration,
  getGoogleIntegrationScope,
} from "./scope"
import { createSignedGoogleState } from "./signing"

const googleProvider = v.union(
  v.literal("gmail"),
  v.literal("googleCalendar"),
  v.literal("googleDrive")
)

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

export const createGoogleDriveInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createInstallState(ctx, "googleDrive", args)
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    provider: googleProvider,
    tenantId: v.string(),
    createdBy: v.string(),
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
    const existing = await findExistingGoogleIntegration(ctx, args)

    const existingRefreshToken = readRefreshToken(existing?.credentials)
    const refreshToken = args.refreshToken ?? existingRefreshToken

    if (refreshToken === undefined) {
      throw new Error("Google OAuth did not return a refresh token")
    }

    const credentials = {
      tokens: {
        access: args.accessToken,
        refresh: refreshToken,
      },
      expiresAt: args.expiresAt,
      scope: args.scope,
    }
    const values = createGoogleIntegrationValues(args, credentials, now)

    if (existing !== null) {
      await ctx.db.patch(existing._id, { ...values, data: undefined })

      await upsertGoogleIdentity(ctx, args)

      return existing._id
    }

    const integrationId = await ctx.db.insert("integrations", {
      ...values,
      createdAt: now,
    })

    await upsertGoogleIdentity(ctx, args)

    return integrationId
  },
})

function createGoogleIntegrationValues(
  args: {
    provider: GoogleIntegration
    tenantId: string
    createdBy: string
    profile: {
      id: string
      email: string
      name?: string
      picture?: string
    }
  },
  credentials: {
    tokens: {
      access: string
      refresh: string
    }
    expiresAt: number
    scope: string | undefined
  },
  now: number
) {
  return {
    tenantId: args.tenantId,
    provider: args.provider,
    scope: getGoogleIntegrationScope(args.provider),
    ownerId:
      getGoogleIntegrationScope(args.provider) === "user"
        ? args.createdBy
        : undefined,
    externalId: args.profile.id,
    name: args.profile.name,
    email: args.profile.email,
    avatar: args.profile.picture,
    credentials,
    status: "active" as const,
    createdBy: args.createdBy,
    updatedAt: now,
  }
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
      (integration.provider !== "gmail" &&
        integration.provider !== "googleCalendar" &&
        integration.provider !== "googleDrive")
    ) {
      throw new Error("Google Workspace integration not found")
    }

    const existingRefreshToken = readRefreshToken(integration.credentials)
    const refreshToken = args.refreshToken ?? existingRefreshToken

    if (refreshToken === undefined) {
      throw new Error("Google Workspace refresh token not found")
    }

    const credentials = {
      tokens: {
        access: args.accessToken,
        refresh: refreshToken,
      },
      expiresAt: args.expiresAt,
      scope: args.scope,
    }

    await ctx.db.patch(args.integrationId, {
      credentials,
      updatedAt: Date.now(),
    })

    return credentials
  },
})

async function createInstallState(
  ctx: MutationCtx,
  provider: GoogleIntegration,
  args: {
    tenantId: string
    returnUrl: string
  }
) {
  return await createSignedGoogleState({
    provider,
    ...(await buildInstallState(ctx, args)),
  })
}

async function upsertGoogleIdentity(
  ctx: MutationCtx,
  args: {
    tenantId: string
    createdBy: string
    profile: {
      id: string
      email: string
    }
  }
) {
  await upsertIdentity(ctx, {
    tenantId: args.tenantId,
    userId: args.createdBy,
    provider: "google",
    externalId: args.profile.id,
    email: args.profile.email,
  })
}

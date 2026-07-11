import { v } from "convex/values"
import { type Id } from "../../_generated/dataModel"
import { internalMutation, mutation } from "../../_generated/server"
import { linkSetupIdentity } from "../../persons/install"
import {
  readRefreshToken,
  requireProviderIntegration,
  saveOAuthCredentials,
} from "../credentials"
import {
  createSignedInstallState,
  findUserIntegrationForInstall,
  upsertIntegration,
} from "../install"
import { type GoogleIntegration } from "./config"

const googleIntegration = v.union(
  v.literal("gmail"),
  v.literal("googleCalendar")
)

export const createGmailInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createSignedInstallState(ctx, "gmail", args)
  },
})

export const createGoogleCalendarInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createSignedInstallState(ctx, "googleCalendar", args)
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    integration: googleIntegration,
    tenantId: v.string(),
    createdBy: v.id("persons"),
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
    const existing = await findUserIntegrationForInstall(ctx, args)

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
    const integrationId = await upsertIntegration(
      ctx,
      existing,
      createGoogleIntegrationValues(args, credentials, now)
    )

    await linkSetupIdentity(ctx, {
      tenantId: args.tenantId,
      personId: args.createdBy,
      provider: "google",
      identity: {
        externalId: args.profile.id,
        email: args.profile.email,
        name: args.profile.name,
      },
    })

    return integrationId
  },
})

function createGoogleIntegrationValues(
  args: {
    integration: GoogleIntegration
    tenantId: string
    createdBy: Id<"persons">
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
    integration: args.integration,
    scope: "user" as const,
    ownerId: args.createdBy,
    externalId: args.profile.id,
    name: args.profile.name,
    email: args.profile.email,
    avatar: args.profile.picture,
    credentials,
    status: "active" as const,
    createdBy: args.createdBy,
    updatedAt: now,
    // Google rows carry no provider data; clear any stale value on reinstall.
    data: undefined,
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
    const integration = await requireProviderIntegration(ctx, {
      integrationId: args.integrationId,
      provider: "google",
      label: "Google Workspace",
    })
    const refreshToken =
      args.refreshToken ?? readRefreshToken(integration.credentials)

    if (refreshToken === undefined) {
      throw new Error("Google Workspace refresh token not found")
    }

    return await saveOAuthCredentials(ctx, args.integrationId, {
      tokens: {
        access: args.accessToken,
        refresh: refreshToken,
      },
      expiresAt: args.expiresAt,
      scope: args.scope,
    })
  },
})

import { v } from "convex/values"
import { internalMutation } from "../../_generated/server"
import {
  requireProviderIntegration,
  requireRefreshToken,
  saveOAuthCredentials,
} from "../connect/credentials"
import { recordUserOAuthInstallation } from "../connect/install"
import { credentialSnapshotValidator } from "../connect/snapshot"

const googleIntegration = v.union(
  v.literal("gmail"),
  v.literal("googleCalendar")
)

export const recordOAuthInstallation = internalMutation({
  args: {
    integration: googleIntegration,
    organizationId: v.string(),
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
    return await recordUserOAuthInstallation(
      ctx,
      {
        organizationId: args.organizationId,
        integration: args.integration,
        createdBy: args.createdBy,
        externalId: args.profile.id,
        name: args.profile.name,
        email: args.profile.email,
        avatar: args.profile.picture,
        credentials: {
          tokens: { access: args.accessToken, refresh: args.refreshToken },
          expiresAt: args.expiresAt,
          scope: args.scope,
        },
        // Google rows carry no provider data; clear any stale value on reinstall.
        data: undefined,
      },
      "Google OAuth did not return a refresh token"
    )
  },
})

export const updateOAuthCredentials = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    expectedSnapshot: credentialSnapshotValidator,
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await requireProviderIntegration(ctx, {
      integrationId: args.integrationId,
      expectedSnapshot: args.expectedSnapshot,
      provider: "google",
      label: "Google Workspace",
    })
    const refreshToken = requireRefreshToken(
      args.refreshToken,
      integration.credentials,
      "Google Workspace refresh token not found"
    )

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

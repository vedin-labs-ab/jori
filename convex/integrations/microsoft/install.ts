import { v } from "convex/values"
import { internalMutation } from "../../_generated/server"
import {
  requireProviderIntegration,
  requireRefreshToken,
  saveOAuthCredentials,
} from "../connect/credentials"
import { recordUserOAuthInstallation } from "../connect/install"
import { credentialSnapshotValidator } from "../connect/snapshot"
import { getMicrosoftIdentityEmail } from "./data"

const microsoftIntegration = v.union(
  v.literal("microsoftCalendar"),
  v.literal("microsoftEmail")
)

export const recordOAuthInstallation = internalMutation({
  args: {
    integration: microsoftIntegration,
    organizationId: v.string(),
    createdBy: v.id("persons"),
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
    return await recordUserOAuthInstallation(
      ctx,
      {
        organizationId: args.organizationId,
        integration: args.integration,
        createdBy: args.createdBy,
        externalId: args.profile.user.id,
        name: args.profile.user.displayName,
        email: getMicrosoftIdentityEmail(args.profile),
        credentials: {
          tokens: { access: args.accessToken, refresh: args.refreshToken },
          expiresAt: args.expiresAt,
          scope: args.scope,
          tenantId: args.microsoftTenantId,
        },
        data: { tenantName: args.profile.tenant.displayName },
      },
      "Microsoft OAuth did not return a refresh token"
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
      provider: "microsoft",
      label: "Microsoft",
    })
    const refreshToken = requireRefreshToken(
      args.refreshToken,
      integration.credentials,
      "Microsoft refresh token not found"
    )
    const tenantId = readTenantId(integration.credentials)

    if (tenantId === undefined) {
      throw new Error("Microsoft tenant ID not found")
    }

    return await saveOAuthCredentials(ctx, args.integrationId, {
      tokens: {
        access: args.accessToken,
        refresh: refreshToken,
      },
      expiresAt: args.expiresAt,
      scope: args.scope,
      tenantId,
    })
  },
})

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

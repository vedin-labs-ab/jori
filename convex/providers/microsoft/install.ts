import { v } from "convex/values"
import { type Id } from "../../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from "../../_generated/server"
import { linkSetupIdentity } from "../../persons/install"
import {
  readRefreshToken,
  requireProviderIntegration,
  saveOAuthCredentials,
} from "../credentials"
import { createSignedInstallState, upsertIntegration } from "../install"
import { type MicrosoftIntegration } from "./config"
import { getMicrosoftIdentityEmail } from "./identity"

const microsoftIntegration = v.union(
  v.literal("microsoftCalendar"),
  v.literal("microsoftEmail")
)

export const createMicrosoftEmailInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createSignedInstallState(ctx, "microsoftEmail", args)
  },
})

export const createMicrosoftCalendarInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createSignedInstallState(ctx, "microsoftCalendar", args)
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    integration: microsoftIntegration,
    tenantId: v.string(),
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
    const now = Date.now()
    const existing = await findExistingMicrosoftIntegration(ctx, args)

    const existingRefreshToken = readRefreshToken(existing?.credentials)
    const refreshToken = args.refreshToken ?? existingRefreshToken

    if (refreshToken === undefined) {
      throw new Error("Microsoft OAuth did not return a refresh token")
    }

    const credentials = {
      tokens: {
        access: args.accessToken,
        refresh: refreshToken,
      },
      expiresAt: args.expiresAt,
      scope: args.scope,
      tenantId: args.microsoftTenantId,
    }
    const email = getMicrosoftIdentityEmail(args.profile)
    const integrationId = await upsertIntegration(ctx, existing, {
      tenantId: args.tenantId,
      integration: args.integration,
      scope: "user",
      ownerId: args.createdBy,
      externalId: args.profile.user.id,
      name: args.profile.user.displayName,
      email,
      credentials,
      status: "active",
      createdBy: args.createdBy,
      updatedAt: now,
      data: {
        tenantName: args.profile.tenant.displayName,
      },
    })

    await linkSetupIdentity(ctx, {
      tenantId: args.tenantId,
      personId: args.createdBy,
      provider: "microsoft",
      identity: {
        externalId: args.profile.user.id,
        email,
        name: args.profile.user.displayName,
      },
    })

    return integrationId
  },
})

async function findExistingMicrosoftIntegration(
  ctx: MutationCtx,
  args: {
    tenantId: string
    integration: MicrosoftIntegration
    createdBy: Id<"persons">
  }
) {
  return await ctx.db
    .query("integrations")
    .withIndex("by_tenant_and_integration_and_owner", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("integration", args.integration)
        .eq("ownerId", args.createdBy)
    )
    .first()
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
      provider: "microsoft",
      label: "Microsoft",
    })
    const refreshToken =
      args.refreshToken ?? readRefreshToken(integration.credentials)
    const tenantId = readTenantId(integration.credentials)

    if (refreshToken === undefined) {
      throw new Error("Microsoft refresh token not found")
    }

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

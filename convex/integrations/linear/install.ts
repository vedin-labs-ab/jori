import { v } from "convex/values"
import { internalMutation, mutation } from "../../_generated/server"
import {
  requireProviderIntegration,
  saveOAuthCredentials,
} from "../connect/credentials"
import { buildInstallState, upsertIntegration } from "../connect/install"
import { findIntegrationByExternalId } from "../data"
import { createSignedLinearState } from "./signing"

export const createInstallState = mutation({
  args: {
    organizationId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createSignedLinearState(await buildInstallState(ctx, args))
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    organizationId: v.string(),
    createdBy: v.id("persons"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
    profile: v.object({
      botId: v.string(),
      botName: v.optional(v.string()),
      organization: v.object({
        id: v.string(),
        name: v.optional(v.string()),
        urlKey: v.optional(v.string()),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await findIntegrationByExternalId(ctx, {
      integration: "linear",
      externalId: args.profile.organization.id,
    })

    return await upsertIntegration(ctx, existing, {
      organizationId: args.organizationId,
      integration: "linear",
      scope: "organization",
      externalId: args.profile.organization.id,
      name: args.profile.organization.name,
      url: getLinearUrl(args.profile.organization.urlKey),
      credentials: {
        tokens: {
          access: args.accessToken,
          refresh: args.refreshToken,
        },
        expiresAt: args.expiresAt,
        scope: args.scope,
      },
      status: "active",
      createdBy: args.createdBy,
      updatedAt: Date.now(),
      data: {
        botId: args.profile.botId,
      },
    })
  },
})

function getLinearUrl(urlKey: string | undefined) {
  return urlKey === undefined ? undefined : `https://linear.app/${urlKey}`
}

export const updateOAuthCredentials = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProviderIntegration(ctx, {
      integrationId: args.integrationId,
      provider: "linear",
      label: "Linear",
    })

    return await saveOAuthCredentials(ctx, args.integrationId, {
      tokens: {
        access: args.accessToken,
        refresh: args.refreshToken,
      },
      expiresAt: args.expiresAt,
      scope: args.scope,
    })
  },
})

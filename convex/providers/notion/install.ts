import { v } from "convex/values"
import { internalMutation, mutation } from "../../_generated/server"
import { findIntegrationByExternalId } from "../../integrations/data"
import {
  linkSetupIdentity,
  setupIdentityValidator,
} from "../../persons/install"
import { buildInstallState, upsertIntegration } from "../install"
import { createSignedNotionState } from "./signing"

export const createInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createSignedNotionState(await buildInstallState(ctx, args))
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    tenantId: v.string(),
    createdBy: v.id("persons"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    profile: v.object({
      botId: v.string(),
      workspaceId: v.string(),
      workspaceName: v.optional(v.string()),
      workspaceIcon: v.optional(v.string()),
      duplicatedTemplateId: v.optional(v.string()),
    }),
    setupIdentity: v.optional(setupIdentityValidator),
  },
  handler: async (ctx, args) => {
    const existing = await findIntegrationByExternalId(ctx, {
      integration: "notion",
      externalId: args.profile.workspaceId,
    })
    const integrationId = await upsertIntegration(ctx, existing, {
      tenantId: args.tenantId,
      integration: "notion",
      scope: "tenant",
      externalId: args.profile.workspaceId,
      name: args.profile.workspaceName,
      avatar: args.profile.workspaceIcon,
      credentials: {
        tokens: {
          access: args.accessToken,
          refresh: args.refreshToken,
        },
      },
      status: "active",
      createdBy: args.createdBy,
      updatedAt: Date.now(),
      data: {
        botId: args.profile.botId,
        duplicatedTemplateId: args.profile.duplicatedTemplateId,
      },
    })

    await linkSetupIdentity(ctx, {
      tenantId: args.tenantId,
      personId: args.createdBy,
      provider: "notion",
      identity: args.setupIdentity,
    })

    return integrationId
  },
})

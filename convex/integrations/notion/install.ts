import { v } from "convex/values"
import { internalMutation } from "../../_generated/server"
import {
  linkSetupIdentity,
  setupIdentityValidator,
} from "../../persons/install"
import { upsertIntegration } from "../connect/install"
import { findIntegrationByExternalId } from "../data"

export const recordOAuthInstallation = internalMutation({
  args: {
    organizationId: v.string(),
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
      organizationId: args.organizationId,
      integration: "notion",
      scope: "organization",
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
      organizationId: args.organizationId,
      personId: args.createdBy,
      provider: "notion",
      identity: args.setupIdentity,
    })

    return integrationId
  },
})

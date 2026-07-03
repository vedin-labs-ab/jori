import { v } from "convex/values"
import { internalMutation, mutation } from "../../_generated/server"
import {
  linkSetupIdentity,
  setupIdentityValidator,
} from "../../persons/install"
import {
  requireProviderIntegration,
  saveOAuthCredentials,
} from "../credentials"
import { buildInstallState } from "../install"
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
    const now = Date.now()
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_integration_and_external", (query) =>
        query
          .eq("integration", "notion")
          .eq("externalId", args.profile.workspaceId)
      )
      .first()

    const credentials = {
      tokens: {
        access: args.accessToken,
        refresh: args.refreshToken,
      },
    }
    const data = {
      botId: args.profile.botId,
      duplicatedTemplateId: args.profile.duplicatedTemplateId,
    }

    const integrationId =
      existing === null
        ? await ctx.db.insert("integrations", {
            tenantId: args.tenantId,
            integration: "notion",
            scope: "tenant",
            externalId: args.profile.workspaceId,
            name: args.profile.workspaceName,
            avatar: args.profile.workspaceIcon,
            credentials,
            status: "active",
            createdBy: args.createdBy,
            createdAt: now,
            updatedAt: now,
            data,
          })
        : existing._id

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        tenantId: args.tenantId,
        scope: "tenant",
        externalId: args.profile.workspaceId,
        name: args.profile.workspaceName,
        avatar: args.profile.workspaceIcon,
        credentials,
        status: "active",
        createdBy: args.createdBy,
        updatedAt: now,
        data,
      })
    }

    await linkSetupIdentity(ctx, {
      tenantId: args.tenantId,
      personId: args.createdBy,
      provider: "notion",
      identity: args.setupIdentity,
    })

    return integrationId
  },
})

export const updateOAuthCredentials = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProviderIntegration(ctx, {
      integrationId: args.integrationId,
      provider: "notion",
      label: "Notion",
    })

    return await saveOAuthCredentials(ctx, args.integrationId, {
      tokens: {
        access: args.accessToken,
        refresh: args.refreshToken,
      },
    })
  },
})

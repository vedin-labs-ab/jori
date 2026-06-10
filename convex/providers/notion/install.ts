import { v } from "convex/values"
import { internalMutation, mutation } from "../../_generated/server"
import { requireClerkUserId } from "../../identity/users"
import { createSignedNotionState } from "./signing"

export const createInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error("Unauthorized")
    }

    return await createSignedNotionState({
      tenantId: args.tenantId,
      createdBy: requireClerkUserId(identity),
      returnUrl: args.returnUrl,
      createdAt: Date.now(),
    })
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    tenantId: v.string(),
    createdBy: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    profile: v.object({
      botId: v.string(),
      workspaceId: v.string(),
      workspaceName: v.optional(v.string()),
      workspaceIcon: v.optional(v.string()),
      owner: v.optional(v.any()),
      duplicatedTemplateId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_provider_and_external", (query) =>
        query
          .eq("provider", "notion")
          .eq("externalId", args.profile.workspaceId)
      )
      .first()

    const credentials = {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
    }
    const data = {
      botId: args.profile.botId,
      owner: args.profile.owner,
      duplicatedTemplateId: args.profile.duplicatedTemplateId,
    }

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

      return existing._id
    }

    return await ctx.db.insert("integrations", {
      tenantId: args.tenantId,
      provider: "notion",
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
  },
})

export const updateOAuthCredentials = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (integration === null || integration.provider !== "notion") {
      throw new Error("Notion integration not found")
    }

    const credentials = {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
    }

    await ctx.db.patch(args.integrationId, {
      credentials,
      updatedAt: Date.now(),
    })

    return credentials
  },
})

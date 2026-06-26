import { v } from "convex/values"
import { internalMutation, mutation } from "../../_generated/server"
import { buildInstallState } from "../install"
import { requireGitHubCredentials } from "./credentials"
import { githubIntegrationData } from "./data"
import { createSignedGitHubState } from "./signing"

export const createInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createSignedGitHubState(await buildInstallState(ctx, args))
  },
})

export const recordInstallation = internalMutation({
  args: {
    tenantId: v.string(),
    createdBy: v.string(),
    installationId: v.string(),
    profile: v.object({
      id: v.number(),
      app_slug: v.optional(v.string()),
      html_url: v.optional(v.string()),
      account: v.optional(
        v.object({
          login: v.optional(v.string()),
          avatar_url: v.optional(v.string()),
          html_url: v.optional(v.string()),
        })
      ),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_integration_and_external", (query) =>
        query.eq("integration", "github").eq("externalId", args.installationId)
      )
      .first()

    const credentials = {
      installationId: args.installationId,
    }

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        tenantId: args.tenantId,
        scope: "tenant",
        externalId: args.installationId,
        name: args.profile.account?.login,
        url: args.profile.account?.html_url ?? args.profile.html_url,
        avatar: args.profile.account?.avatar_url,
        credentials,
        status: "active",
        createdBy: args.createdBy,
        updatedAt: now,
        data: githubIntegrationData(args.profile),
      })

      return existing._id
    }

    return await ctx.db.insert("integrations", {
      tenantId: args.tenantId,
      integration: "github",
      scope: "tenant",
      externalId: args.installationId,
      name: args.profile.account?.login,
      url: args.profile.account?.html_url ?? args.profile.html_url,
      avatar: args.profile.account?.avatar_url,
      credentials,
      status: "active",
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      data: githubIntegrationData(args.profile),
    })
  },
})

export const updateInstallationCredentials = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    accessToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (integration === null || integration.integration !== "github") {
      throw new Error("GitHub integration not found")
    }

    const existingCredentials = requireGitHubCredentials(integration)
    const credentials = {
      installationId: existingCredentials.installationId,
      tokens: {
        access: args.accessToken,
      },
      expiresAt: args.expiresAt,
    }

    await ctx.db.patch(args.integrationId, {
      credentials,
      updatedAt: Date.now(),
    })

    return credentials
  },
})

import { v } from "convex/values"
import { internalMutation } from "../../_generated/server"
import { upsertIntegration } from "../connect/install"
import { findIntegrationByExternalId } from "../data"
import { requireGitHubCredentials } from "./credentials"
import { githubIntegrationData } from "./data"

export const recordInstallation = internalMutation({
  args: {
    organizationId: v.string(),
    createdBy: v.id("persons"),
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
    const existing = await findIntegrationByExternalId(ctx, {
      integration: "github",
      externalId: args.installationId,
    })

    return await upsertIntegration(ctx, existing, {
      organizationId: args.organizationId,
      integration: "github",
      scope: "organization",
      externalId: args.installationId,
      name: args.profile.account?.login,
      url: args.profile.account?.html_url ?? args.profile.html_url,
      avatar: args.profile.account?.avatar_url,
      credentials: {
        installationId: args.installationId,
      },
      status: "active",
      createdBy: args.createdBy,
      updatedAt: Date.now(),
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

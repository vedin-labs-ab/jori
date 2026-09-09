import { v } from "convex/values"
import { internalMutation } from "../../_generated/server"
import {
  requireProviderIntegration,
  saveOAuthCredentials,
} from "../connect/credentials"
import { upsertIntegration } from "../connect/install"
import { credentialSnapshotValidator } from "../connect/snapshot"
import { findIntegrationByExternalId } from "../data"
import { type GitHubInstallationProfile } from "./app"
import { requireGitHubCredentials } from "./credentials"
import { githubIdentity } from "./identity"

export function normalizeInstallationProfile(
  profile: GitHubInstallationProfile
) {
  return {
    id: profile.id,
    app_slug: profile.app_slug,
    html_url: profile.html_url,
    account:
      profile.account === undefined
        ? undefined
        : {
            login: profile.account.login,
            avatar_url: profile.account.avatar_url,
            html_url: profile.account.html_url,
          },
  }
}

export const recordInstallation = internalMutation({
  args: {
    organizationId: v.string(),
    createdBy: v.id("persons"),
    installationId: v.string(),
    identity: githubIdentity,
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
      data: { ...args.identity, installedAt: Date.now() },
    })
  },
})

export const updateInstallationCredentials = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    expectedSnapshot: credentialSnapshotValidator,
    accessToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const integration = await requireProviderIntegration(ctx, {
      integrationId: args.integrationId,
      expectedSnapshot: args.expectedSnapshot,
      provider: "github",
      label: "GitHub",
    })
    const existingCredentials = requireGitHubCredentials(integration)

    return await saveOAuthCredentials(ctx, args.integrationId, {
      installationId: existingCredentials.installationId,
      tokens: {
        access: args.accessToken,
      },
      expiresAt: args.expiresAt,
    })
  },
})

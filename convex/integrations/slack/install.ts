import { v } from "convex/values"
import { internalMutation, internalQuery } from "../../_generated/server"
import {
  linkSetupIdentity,
  setupIdentityValidator,
} from "../../persons/install"
import {
  requireProviderIntegration,
  saveOAuthCredentials,
} from "../connect/credentials"
import { upsertIntegration } from "../connect/install"
import {
  findActiveIntegrationByExternalId,
  findIntegrationByExternalId,
} from "../data"
import { readSlackTokenPair, requireSlackCredentials } from "./credentials"

const tokenPairValidator = v.object({
  access: v.string(),
  refresh: v.string(),
  expiresAt: v.number(),
})

export const getUserToken = internalQuery({
  args: {
    accountId: v.string(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const integration = await findActiveIntegrationByExternalId(ctx, {
      integration: "slack",
      externalId: args.accountId,
    })

    return readSlackUserToken(integration?.credentials) ?? null
  },
})

export const getProfileLookupTarget = internalQuery({
  args: {
    accountId: v.string(),
  },
  returns: v.union(
    v.object({
      organizationId: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const integration = await findActiveIntegrationByExternalId(ctx, {
      integration: "slack",
      externalId: args.accountId,
    })

    return integration === null
      ? null
      : { organizationId: integration.organizationId }
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    organizationId: v.string(),
    createdBy: v.id("persons"),
    accountId: v.string(),
    botScopes: v.optional(v.string()),
    bot: tokenPairValidator,
    team: v.object({
      id: v.string(),
      name: v.optional(v.string()),
    }),
    botUserId: v.optional(v.string()),
    appId: v.optional(v.string()),
    authedUserId: v.optional(v.string()),
    userScopes: v.optional(v.string()),
    user: tokenPairValidator,
    setupIdentity: v.optional(setupIdentityValidator),
  },
  handler: async (ctx, args) => {
    const existing = await findIntegrationByExternalId(ctx, {
      integration: "slack",
      externalId: args.accountId,
    })
    const integrationId = await upsertIntegration(ctx, existing, {
      organizationId: args.organizationId,
      integration: "slack",
      scope: "organization",
      externalId: args.accountId,
      name: args.team.name,
      credentials: {
        bot: args.bot,
        user: args.user,
      },
      status: "active",
      createdBy: args.createdBy,
      updatedAt: Date.now(),
      data: {
        scopes: {
          bot: args.botScopes,
          user: args.userScopes,
        },
        botUserId: args.botUserId,
        appId: args.appId,
        authedUserId: args.authedUserId,
        installedAt: Date.now(),
      },
    })

    await linkSetupIdentity(ctx, {
      organizationId: args.organizationId,
      personId: args.createdBy,
      provider: "slack",
      identity: args.setupIdentity,
    })

    return integrationId
  },
})

/**
 * Writes back a rotated pair.
 *
 * Each side is optional and merged over what is stored, because the bot and
 * user tokens expire on separate clocks: refreshing one must not stamp a
 * stale copy over the other, whose refresh token may already have been spent.
 */
export const updateOAuthCredentials = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    bot: v.optional(tokenPairValidator),
    user: v.optional(tokenPairValidator),
  },
  handler: async (ctx, args) => {
    const integration = await requireProviderIntegration(ctx, {
      integrationId: args.integrationId,
      provider: "slack",
      label: "Slack",
    })
    const current = requireSlackCredentials(integration)

    return await saveOAuthCredentials(ctx, args.integrationId, {
      bot: args.bot ?? current.bot,
      user: args.user ?? current.user,
    })
  },
})

function readSlackUserToken(credentials: unknown) {
  if (
    typeof credentials === "object" &&
    credentials !== null &&
    "user" in credentials
  ) {
    return readSlackTokenPair(credentials.user)?.access
  }

  return undefined
}

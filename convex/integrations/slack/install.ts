import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import {
  type ActionCtx,
  internalMutation,
  internalQuery,
} from "../../_generated/server"
import {
  linkSetupIdentity,
  setupIdentityValidator,
} from "../../persons/install"
import { sha256Hex } from "../../shared/crypto"
import {
  requireProviderIntegration,
  saveOAuthCredentials,
} from "../connect/credentials"
import { upsertIntegration } from "../connect/install"
import {
  credentialSnapshot,
  credentialSnapshotValidator,
} from "../connect/snapshot"
import {
  findActiveIntegrationByExternalId,
  findIntegrationByExternalId,
} from "../data"
import {
  failOAuthRefresh,
  hasFreshTokenExpiration,
  withCredentials,
} from "../refresh"
import {
  readSlackTokenPair,
  requireSlackCredentials,
  slackTokenKinds,
} from "./credentials"
import { refreshSlackAccessToken, slackGrantIsDead } from "./oauth"

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
    expectedSnapshot: credentialSnapshotValidator,
    expectedTokens: v.object({
      bot: v.optional(v.string()),
      user: v.optional(v.string()),
    }),
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
    if (
      integration.status !== "active" ||
      (integration.connectionGeneration ?? 0) !==
        args.expectedSnapshot.connectionGeneration
    ) {
      throw new Error("Integration connection changed during token refresh")
    }
    // The other token may rotate concurrently. Compare only the sides being
    // replaced, so their successful refreshes can still merge safely.
    for (const kind of slackTokenKinds) {
      if (
        args[kind] !== undefined &&
        args.expectedTokens[kind] !== (await sha256Hex(current[kind].refresh))
      ) {
        throw new Error("Integration connection changed during token refresh")
      }
    }
    const credentials = await saveOAuthCredentials(ctx, args.integrationId, {
      bot: args.bot ?? current.bot,
      user: args.user ?? current.user,
    })
    return {
      credentials,
      credentialVersion: (integration.credentialVersion ?? 0) + 1,
    }
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

export async function prepareSlackIntegrationForRuntime(
  ctx: ActionCtx,
  integration: Doc<"integrations">
): Promise<Doc<"integrations">> {
  let current = integration
  for (const kind of slackTokenKinds) {
    const credentials = requireSlackCredentials(current)
    if (hasFreshTokenExpiration(credentials[kind].expiresAt)) {
      continue
    }
    const expected = await sha256Hex(credentials[kind].refresh)
    const result = await refreshSlackAccessToken(credentials[kind].refresh)
    if (!result.ok) {
      return await failOAuthRefresh(ctx, current, "Slack", {
        error: slackGrantIsDead(result.error) ? "invalid_grant" : "slack_error",
        error_description: result.error,
      })
    }
    // Persist each single-use refresh token before exchanging the other side.
    const updated = await ctx.runMutation(
      internal.integrations.slack.install.updateOAuthCredentials,
      {
        integrationId: current._id,
        expectedSnapshot: credentialSnapshot(current),
        expectedTokens: { [kind]: expected },
        [kind]: {
          access: result.access_token,
          refresh: result.refresh_token,
          expiresAt: Date.now() + result.expires_in * 1000,
        },
      }
    )
    current = {
      ...withCredentials(current, updated.credentials),
      credentialVersion: updated.credentialVersion,
    }
  }
  return current
}

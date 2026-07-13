import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  mutation,
} from "../../_generated/server"
import {
  linkSetupIdentity,
  setupIdentityValidator,
} from "../../persons/install"
import { buildInstallState, upsertIntegration } from "../connect/install"
import {
  findActiveIntegrationByExternalId,
  findIntegrationByExternalId,
} from "../data"
import { createSignedSlackState } from "./signing"

export const createInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createSignedSlackState(await buildInstallState(ctx, args))
  },
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
      tenantId: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const integration = await findActiveIntegrationByExternalId(ctx, {
      integration: "slack",
      externalId: args.accountId,
    })

    return integration === null ? null : { tenantId: integration.tenantId }
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    tenantId: v.string(),
    createdBy: v.id("persons"),
    accountId: v.string(),
    botScopes: v.optional(v.string()),
    botToken: v.string(),
    team: v.object({
      id: v.string(),
      name: v.optional(v.string()),
    }),
    botUserId: v.optional(v.string()),
    userScopes: v.optional(v.string()),
    userToken: v.string(),
    setupIdentity: v.optional(setupIdentityValidator),
  },
  handler: async (ctx, args) => {
    const existing = await findIntegrationByExternalId(ctx, {
      integration: "slack",
      externalId: args.accountId,
    })
    const integrationId = await upsertIntegration(ctx, existing, {
      tenantId: args.tenantId,
      integration: "slack",
      scope: "tenant",
      externalId: args.accountId,
      name: args.team.name,
      credentials: {
        bot: args.botToken,
        user: args.userToken,
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
      },
    })

    await linkSetupIdentity(ctx, {
      tenantId: args.tenantId,
      personId: args.createdBy,
      provider: "slack",
      identity: args.setupIdentity,
    })

    return integrationId
  },
})

function readSlackUserToken(credentials: unknown) {
  if (
    typeof credentials === "object" &&
    credentials !== null &&
    "user" in credentials &&
    typeof credentials.user === "string"
  ) {
    return credentials.user
  }

  return undefined
}

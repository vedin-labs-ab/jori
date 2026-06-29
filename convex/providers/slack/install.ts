import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  mutation,
  type QueryCtx,
} from "../../_generated/server"
import { buildInstallState } from "../install"
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
    const integration = await findActiveSlackIntegration(ctx, args.accountId)

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
    const integration = await findActiveSlackIntegration(ctx, args.accountId)

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
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_integration_and_external", (query) =>
        query.eq("integration", "slack").eq("externalId", args.accountId)
      )
      .first()

    const credentials = {
      bot: args.botToken,
      user: args.userToken,
    }

    const data = {
      scopes: {
        bot: args.botScopes,
        user: args.userScopes,
      },
      botUserId: args.botUserId,
    }

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        tenantId: args.tenantId,
        scope: "tenant",
        externalId: args.accountId,
        name: args.team.name,
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
      integration: "slack",
      scope: "tenant",
      externalId: args.accountId,
      name: args.team.name,
      credentials,
      status: "active",
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      data,
    })
  },
})

async function findActiveSlackIntegration(ctx: QueryCtx, accountId: string) {
  const integration = await ctx.db
    .query("integrations")
    .withIndex("by_integration_and_external", (query) =>
      query.eq("integration", "slack").eq("externalId", accountId)
    )
    .first()

  return integration?.status === "active" ? integration : null
}

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

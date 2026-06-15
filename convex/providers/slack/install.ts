import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  mutation,
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
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_integration_and_external", (query) =>
        query.eq("integration", "slack").eq("externalId", args.accountId)
      )
      .first()

    if (integration === null || integration.status !== "active") {
      return null
    }

    const credentials = integration.credentials

    if (
      typeof credentials === "object" &&
      credentials !== null &&
      "user" in credentials &&
      typeof credentials.user === "string"
    ) {
      return credentials.user
    }

    return null
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    tenantId: v.string(),
    createdBy: v.string(),
    accountId: v.string(),
    botScopes: v.optional(v.string()),
    botToken: v.string(),
    team: v.object({
      id: v.string(),
      name: v.optional(v.string()),
    }),
    botId: v.optional(v.string()),
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
      botId: args.botId,
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

import { v } from "convex/values"
import { internalMutation, mutation } from "../../_generated/server"
import { buildInstallState } from "../install"
import { createSignedLinearState } from "./signing"

export const createInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await createSignedLinearState(await buildInstallState(ctx, args))
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    tenantId: v.string(),
    createdBy: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
    profile: v.object({
      botId: v.string(),
      botName: v.optional(v.string()),
      organization: v.object({
        id: v.string(),
        name: v.optional(v.string()),
        urlKey: v.optional(v.string()),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_provider_and_external", (query) =>
        query
          .eq("provider", "linear")
          .eq("externalId", args.profile.organization.id)
      )
      .first()

    const credentials = {
      tokens: {
        access: args.accessToken,
        refresh: args.refreshToken,
      },
      expiresAt: args.expiresAt,
      scope: args.scope,
    }
    const data = {
      botId: args.profile.botId,
    }
    const url = getLinearUrl(args.profile.organization.urlKey)

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        tenantId: args.tenantId,
        scope: "tenant",
        externalId: args.profile.organization.id,
        name: args.profile.organization.name,
        url,
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
      provider: "linear",
      scope: "tenant",
      externalId: args.profile.organization.id,
      name: args.profile.organization.name,
      url,
      credentials,
      status: "active",
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      data,
    })
  },
})

function getLinearUrl(urlKey: string | undefined) {
  return urlKey === undefined ? undefined : `https://linear.app/${urlKey}`
}

export const updateOAuthCredentials = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (integration === null || integration.provider !== "linear") {
      throw new Error("Linear integration not found")
    }

    const credentials = {
      tokens: {
        access: args.accessToken,
        refresh: args.refreshToken,
      },
      expiresAt: args.expiresAt,
      scope: args.scope,
    }

    await ctx.db.patch(args.integrationId, {
      credentials,
      updatedAt: Date.now(),
    })

    return credentials
  },
})

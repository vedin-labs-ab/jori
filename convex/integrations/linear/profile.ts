import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server"
import { readDataString } from "../../shared/data"
import { readRecord } from "../../shared/input"
import { prepareIntegrationForRuntime } from "../runtime"
import { requireLinearCredentials } from "./credentials"
import { fetchLinearInstallationProfile } from "./oauth"

export const get = internalQuery({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)
    return integration?.integration === "linear" &&
      integration.status === "active"
      ? integration
      : null
  },
})

export const page = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) =>
    await ctx.db
      .query("integrations")
      .withIndex("by_integration_and_external", (query) =>
        query.eq("integration", "linear")
      )
      .paginate({ cursor: args.cursor, numItems: 25 }),
})

/** Refresh after a provider rename without replacing the connection or grant. */
export const refresh = internalAction({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (
    ctx,
    args
  ): Promise<{ cursor: string | null; refreshed: number }> => {
    const result: {
      page: Doc<"integrations">[]
      isDone: boolean
      continueCursor: string
    } = await ctx.runQuery(internal.integrations.linear.profile.page, args)
    let refreshed = 0
    for (const existing of result.page) {
      if (existing.status !== "active") {
        continue
      }
      const integration = await prepareIntegrationForRuntime(ctx, {
        integration: existing,
      })
      const profile = await fetchLinearInstallationProfile(
        requireLinearCredentials(integration).tokens.access
      )
      const saved: boolean = await ctx.runMutation(
        internal.integrations.linear.profile.save,
        {
          integrationId: integration._id,
          workspaceId: profile.organization.id,
          botId: profile.botId,
          botDisplayName: profile.botDisplayName,
          botUrl: profile.botUrl,
        }
      )
      if (saved) {
        refreshed += 1
      }
    }
    return { cursor: result.isDone ? null : result.continueCursor, refreshed }
  },
})

export const save = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    workspaceId: v.string(),
    botId: v.string(),
    botDisplayName: v.string(),
    botUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)
    if (
      integration?.integration !== "linear" ||
      integration.status !== "active"
    ) {
      return false
    }
    if (
      integration.externalId !== args.workspaceId ||
      readDataString(integration.data, "botId") !== args.botId
    ) {
      throw new Error(
        "Linear installation identity changed; reconnect the integration."
      )
    }
    await ctx.db.patch(integration._id, {
      data: {
        ...readRecord(integration.data),
        botDisplayName: args.botDisplayName,
        botUrl: args.botUrl,
      },
      updatedAt: Date.now(),
    })
    return true
  },
})

export const revoke = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    observedAt: v.number(),
    expectedConnectionGeneration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)
    if (
      integration?.integration !== "linear" ||
      integration.status !== "active" ||
      (args.expectedConnectionGeneration !== undefined &&
        (integration.connectionGeneration ?? 0) !==
          args.expectedConnectionGeneration)
    ) {
      return
    }
    const installedAt = readRecord(integration.data).installedAt
    if (typeof installedAt === "number" && args.observedAt < installedAt) {
      return
    }
    await ctx.db.patch(integration._id, {
      status: "expired",
      updatedAt: Date.now(),
    })
  },
})

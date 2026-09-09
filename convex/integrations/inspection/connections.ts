import { v } from "convex/values"
import { internalQuery } from "../../_generated/server"
import { readDataString } from "../../shared/data"
import { webhookProvider } from "../webhooks/schema"

// Operator inspection deliberately projects fields. Never return credentials
// or the provider data object, even when adding fields to an integration.
export const list = internalQuery({
  args: { provider: webhookProvider, cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("integrations")
      .withIndex("by_integration_and_external", (q) =>
        q.eq("integration", args.provider)
      )
      .paginate({ numItems: 25, cursor: args.cursor ?? null })
    return {
      ...page,
      page: page.page.map((row) => ({
        id: row._id,
        organizationId: row.organizationId,
        provider: row.integration,
        externalId: row.externalId,
        status: row.status,
        name: row.name,
        url: row.url,
        connectionGeneration: row.connectionGeneration ?? 0,
        updatedAt: row.updatedAt,
        identity: publicIdentity(row.data),
      })),
    }
  },
})

function publicIdentity(data: unknown) {
  const names = [
    "appId",
    "appSlug",
    "botLogin",
    "botUserId",
    "botId",
    "botDisplayName",
    "botName",
    "botUrl",
  ]
  return Object.fromEntries(
    names.flatMap((name) => {
      const value = readDataString(data, name)
      return value === undefined ? [] : [[name, value]]
    })
  )
}

export const receipts = internalQuery({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("webhookDeliveries")
      .order("desc")
      .paginate({ numItems: 25, cursor: args.cursor ?? null })
    return {
      ...page,
      page: page.page.map((row) => ({
        id: row._id,
        provider: row.provider,
        eventId: row.eventId,
        integrationId: row.integrationId,
        organizationId: row.organizationId,
        status: row.status,
        attempts: row.attempts,
        connectionGeneration: row.connectionGeneration,
        receivedAt: row._creationTime,
        dueAt: row.dueAt,
      })),
    }
  },
})

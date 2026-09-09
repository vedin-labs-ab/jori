import { v } from "convex/values"
import { internal } from "../../_generated/api"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../../_generated/server"
import { findActiveIntegrationByExternalId } from "../data"
import {
  webhookLeaseMs,
  webhookMaxAttempts,
  webhookRetentionMs,
  webhookRetryDelay,
} from "./policy"
import { webhookProvider } from "./schema"

// Call only after verifying the provider signature. Acceptance and scheduling
// commit together in the receiving region, before the HTTP response is sent.
export const accept = internalMutation({
  args: {
    provider: webhookProvider,
    externalId: v.string(),
    eventId: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const integration = await findActiveIntegrationByExternalId(ctx, {
      integration: args.provider,
      externalId: args.externalId,
    })
    if (integration === null) {
      return { status: "missing_integration" as const }
    }
    const existing = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_provider_and_event", (q) =>
        q.eq("provider", args.provider).eq("eventId", args.eventId)
      )
      .unique()
    if (existing !== null) {
      return { status: "duplicate" as const, id: existing._id }
    }
    const id = await ctx.db.insert("webhookDeliveries", {
      provider: args.provider,
      eventId: args.eventId,
      integrationId: integration._id,
      organizationId: integration.organizationId,
      connectionGeneration: integration.connectionGeneration ?? 0,
      payload: args.payload,
      status: "queued",
      attempts: 0,
      dueAt: Date.now(),
      expiresAt: Date.now() + webhookRetentionMs,
    })
    await ctx.scheduler.runAfter(0, internal.integrations.webhooks.worker.run, {
      id,
    })
    return { status: "accepted" as const, id }
  },
})

export const claim = internalMutation({
  args: { id: v.id("webhookDeliveries") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id)
    if (row !== null && row.expiresAt <= Date.now()) {
      await ctx.db.delete(id)
      return null
    }
    if (
      row?.payload === undefined ||
      row.dueAt === undefined ||
      row.dueAt > Date.now()
    ) {
      return null
    }
    const integration = await ctx.db.get(row.integrationId)
    if (
      integration === null ||
      integration.status !== "active" ||
      integration.integration !== row.provider ||
      integration.organizationId !== row.organizationId ||
      (integration.connectionGeneration ?? 0) !== row.connectionGeneration
    ) {
      await ctx.db.patch(id, {
        status: "inactive",
        payload: undefined,
        dueAt: undefined,
      })
      return null
    }
    if (row.attempts >= webhookMaxAttempts) {
      await ctx.db.patch(id, { status: "failed", dueAt: undefined })
      return null
    }
    const attempts = row.attempts + 1
    await ctx.db.patch(id, {
      attempts,
      status: "processing",
      dueAt: Date.now() + webhookLeaseMs,
    })
    return { ...row, attempts }
  },
})

export const finish = internalMutation({
  args: {
    id: v.id("webhookDeliveries"),
    attempt: v.number(),
    succeeded: v.boolean(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id)
    if (
      row === null ||
      row.attempts !== args.attempt ||
      row.status !== "processing"
    ) {
      return
    }
    if (args.succeeded) {
      await ctx.db.patch(row._id, {
        status: "completed",
        payload: undefined,
        dueAt: undefined,
      })
      return
    }
    if (row.attempts >= webhookMaxAttempts) {
      await ctx.db.patch(row._id, { status: "failed", dueAt: undefined })
      return
    }
    const dueAt = Date.now() + webhookRetryDelay(row.attempts)
    await ctx.db.patch(row._id, { status: "queued", dueAt })
    await ctx.scheduler.runAt(
      dueAt,
      internal.integrations.webhooks.worker.run,
      {
        id: row._id,
      }
    )
  },
})

// Internal operations expose receipt metadata only, never provider payloads.
export const failures = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .take(100)
    return rows.map(
      ({ _id, provider, eventId, integrationId, attempts, expiresAt }) => ({
        id: _id,
        provider,
        eventId,
        integrationId,
        attempts,
        expiresAt,
      })
    )
  },
})

export const retry = internalMutation({
  args: { id: v.id("webhookDeliveries") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id)
    if (
      row?.status !== "failed" ||
      row.payload === undefined ||
      row.expiresAt <= Date.now()
    ) {
      return false
    }
    await ctx.db.patch(id, { status: "queued", attempts: 0, dueAt: Date.now() })
    await ctx.scheduler.runAfter(0, internal.integrations.webhooks.worker.run, {
      id,
    })
    return true
  },
})

export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const due = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_dueAt", (q) => q.gt("dueAt", 0).lte("dueAt", Date.now()))
      .take(50)
    for (const row of due) {
      await ctx.scheduler.runAfter(
        0,
        internal.integrations.webhooks.worker.run,
        {
          id: row._id,
        }
      )
    }
    await cleanExpired(ctx)
  },
})

export const clean = internalMutation({
  args: {},
  handler: async (ctx) => {
    await cleanExpired(ctx)
  },
})

async function cleanExpired(ctx: MutationCtx) {
  const expired = await ctx.db
    .query("webhookDeliveries")
    .withIndex("by_expiresAt", (q) => q.lte("expiresAt", Date.now()))
    .take(100)
  for (const row of expired) {
    await ctx.db.delete(row._id)
  }
  if (expired.length === 100) {
    await ctx.scheduler.runAfter(
      0,
      internal.integrations.webhooks.delivery.clean,
      {}
    )
  }
}

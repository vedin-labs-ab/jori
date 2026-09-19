import { v } from "convex/values"
import { internal } from "../../_generated/api"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../../_generated/server"

export async function queueCancellation(
  ctx: MutationCtx,
  args: {
    organizationId: string
    customerId: string
    subscriptionId: string
    orderId: string
  }
) {
  const existing = await ctx.db
    .query("billingCancellations")
    .withIndex("by_subscriptionId", (q) =>
      q.eq("subscriptionId", args.subscriptionId)
    )
    .unique()
  if (existing !== null) {
    return
  }
  const id = await ctx.db.insert("billingCancellations", {
    ...args,
    createdAt: Date.now(),
    nextAt: Date.now() + 300_000,
  })
  await ctx.scheduler.runAfter(0, internal.billing.polar.late.cancel, { id })
}

export const read = internalQuery({
  args: { id: v.id("billingCancellations") },
  handler: async (ctx, args) => await ctx.db.get(args.id),
})

export const completed = internalMutation({
  args: { id: v.id("billingCancellations") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id)
    if (row !== null && row.canceledAt === undefined) {
      await ctx.db.patch(row._id, {
        canceledAt: Date.now(),
        nextAt: undefined,
        error: undefined,
      })
    }
  },
})

export const failed = internalMutation({
  args: { id: v.id("billingCancellations"), error: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id)
    if (row !== null && row.canceledAt === undefined) {
      await ctx.db.patch(row._id, {
        nextAt: Date.now() + 300_000,
        error: args.error.slice(0, 500),
      })
    }
  },
})

/** A persisted retry survives action interruption; duplicate cancellation is safe. */
export const retry = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("billingCancellations")
      .withIndex("by_nextAt", (q) =>
        q.gt("nextAt", 0).lte("nextAt", Date.now())
      )
      .take(50)
    for (const row of rows) {
      await ctx.db.patch(row._id, { nextAt: Date.now() + 300_000 })
      await ctx.scheduler.runAfter(0, internal.billing.polar.late.cancel, {
        id: row._id,
      })
    }
  },
})

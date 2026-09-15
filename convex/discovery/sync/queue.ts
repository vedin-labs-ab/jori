import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { internalMutation } from "../../_generated/server"
import { isWorkspaceDeleting } from "../../retention/access"
import { lane } from "../schema"

const leaseDuration = 35 * 60_000
/** One batch per organization and lane. A lease outlives Convex's maximum
 * action lifetime, so expired workers can never write after their successor. */
export const start = internalMutation({
  args: { organizationId: v.string(), lane },
  handler: async (ctx, args) => {
    if (await isWorkspaceDeleting(ctx, args.organizationId)) {
      return null
    }
    const now = Date.now()
    const row = await ctx.db
      .query("discoveryQueues")
      .withIndex("by_organizationId_and_lane", (q) =>
        q.eq("organizationId", args.organizationId).eq("lane", args.lane)
      )
      .unique()
    if (row && row.lease > now) {
      return null
    }
    const first = await ctx.db
      .query("discoverySources")
      .withIndex("by_organizationId_and_lane_and_pending_and_nextAt", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("lane", args.lane)
          .eq("pending", true)
      )
      .first()
    if (!first) {
      if (row) {
        await ctx.db.delete(row._id)
      }
      return null
    }
    if (first.nextAt > now) {
      if (row) {
        await ctx.db.patch(row._id, { nextAt: first.nextAt })
      } else {
        await ctx.db.insert("discoveryQueues", {
          ...args,
          lease: 0,
          nextAt: first.nextAt,
        })
      }
      await ctx.scheduler.runAt(
        first.nextAt,
        internal.discovery.sync.queue.start,
        args
      )
      return null
    }
    const lease = now + leaseDuration
    const id = row
      ? row._id
      : await ctx.db.insert("discoveryQueues", {
          ...args,
          lease,
          nextAt: lease,
        })
    if (row) {
      await ctx.db.patch(id, { lease, nextAt: lease })
    }
    await ctx.scheduler.runAfter(0, internal.discovery.sync.worker.run, {
      ...args,
      lease,
    })
    return null
  },
})
export const release = internalMutation({
  args: { organizationId: v.string(), lane, lease: v.number() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("discoveryQueues")
      .withIndex("by_organizationId_and_lane", (q) =>
        q.eq("organizationId", args.organizationId).eq("lane", args.lane)
      )
      .unique()
    if (row?.lease !== args.lease) {
      return
    }
    await ctx.db.patch(row._id, { lease: 0, nextAt: Date.now() + 100 })
    await ctx.scheduler.runAfter(100, internal.discovery.sync.queue.start, {
      organizationId: args.organizationId,
      lane: args.lane,
    })
  },
})

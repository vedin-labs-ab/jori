import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server"
import { erase } from "../provider"
export const read = internalQuery({
  args: { id: v.id("workspaceRetention") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id)
    if (!row) {
      return null
    }
    const source = await ctx.db
      .query("discoverySources")
      .withIndex("by_organizationId_and_pending", (q) =>
        q.eq("organizationId", row.organizationId)
      )
      .first()
    return { ...row, hasSources: source !== null }
  },
})
export const run = internalAction({
  args: { id: v.id("workspaceRetention") },
  handler: async (ctx, args) => {
    const row: (Doc<"workspaceRetention"> & { hasSources: boolean }) | null =
      await ctx.runQuery(internal.discovery.sync.erasure.read, args)
    if (
      row?.state !== "deleting" ||
      row.discoveryErasedAt ||
      Date.now() < (row.startedAt ?? Date.now()) + 35 * 60_000
    ) {
      return
    }
    try {
      if (
        !(await ctx.runAction(internal.discovery.extraction.cleanup.workspace, {
          organizationId: row.organizationId,
        }))
      ) {
        throw new Error("Cleanup pending")
      }
      if (row.hasSources) {
        await erase(row.organizationId)
      }
      await ctx.runMutation(internal.discovery.sync.erasure.finished, args)
    } catch {
      await ctx.runMutation(internal.retention.deletion.waiting, {
        id: row._id,
        message: "Search deletion is waiting for the regional service.",
      })
    }
  },
})
export const finished = internalMutation({
  args: { id: v.id("workspaceRetention") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id)
    if (row?.state !== "deleting") {
      return
    }
    await ctx.db.patch(row._id, {
      discoveryErasedAt: Date.now(),
      waiting: undefined,
    })
    await ctx.scheduler.runAfter(0, internal.retention.deletion.step, args)
  },
})

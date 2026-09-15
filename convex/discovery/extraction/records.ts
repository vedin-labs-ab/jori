import { defineTable } from "convex/server"
import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { internalMutation, internalQuery } from "../../_generated/server"
import { isWorkspaceDeleting } from "../../retention/access"

export const discoverySandboxes = defineTable({
  organizationId: v.string(),
  sourceKey: v.string(),
  revision: v.string(),
  externalId: v.string(),
  createdAt: v.number(),
}).index("by_organizationId", ["organizationId"])

export const register = internalMutation({
  args: {
    organizationId: v.string(),
    sourceKey: v.string(),
    revision: v.string(),
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    if (await isWorkspaceDeleting(ctx, args.organizationId)) {
      return null
    }
    const id = await ctx.db.insert("discoverySandboxes", {
      ...args,
      createdAt: Date.now(),
    })
    await ctx.scheduler.runAfter(
      10 * 60_000,
      internal.discovery.extraction.cleanup.run,
      { id }
    )
    return id
  },
})

export const get = internalQuery({
  args: { id: v.id("discoverySandboxes") },
  handler: async (ctx, { id }) => await ctx.db.get(id),
})
export const workspace = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) =>
    await ctx.db
      .query("discoverySandboxes")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .take(25),
})
export const remove = internalMutation({
  args: { id: v.id("discoverySandboxes") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
  },
})

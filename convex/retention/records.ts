import { v } from "convex/values"
import { internalQuery } from "../_generated/server"
import { isWorkspaceDeleting } from "./access"

export const deleting = internalQuery({
  args: { organizationId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) =>
    await isWorkspaceDeleting(ctx, args.organizationId),
})

export const sandboxes = internalQuery({
  args: { id: v.id("workspaceRetention") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id)
    if (row?.state !== "deleting") {
      return []
    }
    return await ctx.db
      .query("sandboxes")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", row.organizationId)
      )
      .take(10)
  },
})

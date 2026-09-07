import { internal } from "../_generated/api"
import { internalMutation } from "../_generated/server"

/** Recover an interrupted action without relying on its scheduler receipt. */
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const due = await ctx.db
      .query("emailSubmissions")
      .withIndex("by_dueAt", (q) => q.gt("dueAt", 0).lte("dueAt", Date.now()))
      .take(50)
    for (const row of due) {
      await ctx.scheduler.runAfter(0, internal.email.dispatch.run, {
        id: row._id,
      })
    }
    const expired = await ctx.db
      .query("emailSubmissions")
      .withIndex("by_expiresAt", (q) => q.lte("expiresAt", Date.now()))
      .take(100)
    for (const row of expired) {
      await ctx.db.delete(row._id)
    }
  },
})

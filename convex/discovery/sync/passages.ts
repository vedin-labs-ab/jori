import { v } from "convex/values"
import { location } from "../../../contracts/discovery/validators"
import { internalMutation } from "../../_generated/server"
import { isWorkspaceDeleting } from "../../retention/access"
import { findSource } from "./intent"
export const store = internalMutation({
  args: {
    organizationId: v.string(),
    key: v.string(),
    generation: v.number(),
    start: v.number(),
    sections: v.array(v.object({ text: v.string(), location })),
  },
  handler: async (ctx, args) => {
    const row = await findSource(ctx, args.key)
    if (
      !row ||
      row.generation !== args.generation ||
      row.organizationId !== args.organizationId ||
      (await isWorkspaceDeleting(ctx, args.organizationId))
    ) {
      return false
    }
    // A partial overwrite must never remain an accepted extraction cache.
    await ctx.db.patch(row._id, { fileKey: undefined, revision: undefined })
    for (const [index, section] of args.sections.entries()) {
      const part = args.start + index
      const old = await ctx.db
        .query("discoveryPassages")
        .withIndex("by_key_and_part", (q) =>
          q.eq("key", args.key).eq("part", part)
        )
        .unique()
      const value = {
        organizationId: args.organizationId,
        key: args.key,
        part,
        ...section,
      }
      if (old) {
        await ctx.db.replace(old._id, value)
      } else {
        await ctx.db.insert("discoveryPassages", value)
      }
    }
    return true
  },
})
export const prune = internalMutation({
  args: { key: v.string(), generation: v.number(), parts: v.number() },
  handler: async (ctx, args) => {
    const row = await findSource(ctx, args.key)
    if (!row || row.generation !== args.generation) {
      return false
    }
    const records = await ctx.db
      .query("discoveryPassages")
      .withIndex("by_key_and_part", (q) =>
        q.eq("key", args.key).gte("part", args.parts)
      )
      .take(100)
    for (const record of records) {
      await ctx.db.delete(record._id)
    }
    return records.length === 100
  },
})

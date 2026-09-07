import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import { internalMutation, internalQuery } from "../../../_generated/server"

const lifetimeMs = 10 * 60 * 1000

/** Arm immediately before requesting Notion's verification delivery. */
export const begin = internalMutation({
  args: {},
  returns: v.id("notionWebhookSetups"),
  handler: async (ctx) => {
    const previous = await ctx.db.query("notionWebhookSetups").unique()
    if (previous !== null) {
      await ctx.db.delete(previous._id)
    }
    const expiresAt = Date.now() + lifetimeMs
    const id = await ctx.db.insert("notionWebhookSetups", { expiresAt })
    await ctx.scheduler.runAt(
      expiresAt,
      internal.integrations.notion.setup.index.clear,
      { id }
    )
    return id
  },
})

/** The candidate is untrusted until the administrator verifies it in Notion.
 * Capturing it never changes the environment's active signing secret. */
export const capture = internalMutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, { token }) => {
    if (!/^secret_[A-Za-z0-9_-]{16,128}$/.test(token)) {
      return null
    }
    const setup = await ctx.db.query("notionWebhookSetups").unique()
    if (
      setup === null ||
      setup.expiresAt <= Date.now() ||
      setup.token !== undefined
    ) {
      return null
    }
    await ctx.db.patch(setup._id, { token })
    return null
  },
})

/** Read through a private administrator pipe, never a log or public API. */
export const read = internalQuery({
  args: { id: v.id("notionWebhookSetups") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { id }) => {
    const setup = await ctx.db.get(id)
    return setup !== null && setup.expiresAt > Date.now()
      ? (setup.token ?? null)
      : null
  },
})

export const clear = internalMutation({
  args: { id: v.id("notionWebhookSetups") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    if ((await ctx.db.get(id)) !== null) {
      await ctx.db.delete(id)
    }
    return null
  },
})

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server"
import { fetchReadableText, hashText } from "./crawl"

const dayMs = 24 * 60 * 60 * 1000
const processedIntervalMs = 14 * dayMs
const sweepBatch = 50

// Daily heartbeat: hands every due source to a check action. Scheduling from a
// mutation is atomic, so each due source is guaranteed a check.
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const due = await ctx.db
      .query("organizationSources")
      .withIndex("by_check_at", (q) => q.lte("checkAt", now))
      .take(sweepBatch)

    for (const entry of due) {
      await ctx.scheduler.runAfter(0, internal.organization.watch.check, {
        sourceId: entry._id,
      })
    }
  },
})

export const byId = internalQuery({
  args: { sourceId: v.id("organizationSources") },
  handler: async (ctx, args) => await ctx.db.get(args.sourceId),
})

export const check = internalAction({
  args: { sourceId: v.id("organizationSources") },
  handler: async (ctx: ActionCtx, args) => {
    const current: Doc<"organizationSources"> | null = await ctx.runQuery(
      internal.organization.watch.byId,
      { sourceId: args.sourceId }
    )

    if (current === null) {
      return
    }

    const text = await fetchReadableText(current.url)
    await ctx.runMutation(internal.organization.watch.record, {
      sourceId: args.sourceId,
      ...(text === null ? {} : { hash: await hashText(text) }),
    })
  },
})

export const record = internalMutation({
  args: { sourceId: v.id("organizationSources"), hash: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const current = await ctx.db.get(args.sourceId)

    if (current === null) {
      return
    }

    const now = Date.now()

    if (args.hash === undefined || args.hash === current.hash) {
      await ctx.db.patch(current._id, { checkAt: now + dayMs })

      return
    }

    await ctx.db.patch(current._id, {
      changedAt: now,
      checkAt: now + processedIntervalMs,
    })

    const primaryUrl = await readPrimaryUrl(ctx, current.organizationId)

    // The draft re-baselines hashes; rare concurrent changes may double-run it.
    await ctx.scheduler.runAfter(0, internal.organization.draft.run, {
      primaryUrl: primaryUrl ?? current.url,
      organizationId: current.organizationId,
    })
  },
})

async function readPrimaryUrl(
  ctx: { db: MutationCtx["db"] },
  organizationId: string
) {
  const sources = await ctx.db
    .query("organizationSources")
    .withIndex("by_organization_and_url", (q) =>
      q.eq("organizationId", organizationId)
    )
    .take(sweepBatch)

  return sources.find((source) => source.primary)?.url ?? null
}

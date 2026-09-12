import { v } from "convex/values"
import { internalMutation, internalQuery } from "../_generated/server"
import { recordBackfillEvent } from "../events/data"
import { eventData } from "../events/schema"
import { isWorkspaceDeleting } from "../retention/access"
import { actorValidator } from "../shared/actor"
import { backfillCursor } from "./schema"

const backfillEvent = v.object({
  key: v.string(),
  type: v.string(),
  text: v.string(),
  actor: v.optional(actorValidator),
  data: eventData,
  observedAt: v.number(),
})

export const byId = internalQuery({
  args: { backfillId: v.id("backfills") },
  handler: async (ctx, args) => {
    const backfill = await ctx.db.get(args.backfillId)

    if (
      backfill === null ||
      (await isWorkspaceDeleting(ctx, backfill.organizationId))
    ) {
      return null
    }

    const integration = await ctx.db.get(backfill.integrationId)

    return integration === null ? null : { backfill, integration }
  },
})

// One bounded batch of historical events. Duplicates are expected where the
// backfill window overlaps webhook coverage; the per-key dedupe absorbs
// re-runs of the backfill itself.
export const record = internalMutation({
  args: {
    backfillId: v.id("backfills"),
    events: v.array(backfillEvent),
  },
  handler: async (ctx, args) => {
    const backfill = await ctx.db.get(args.backfillId)

    if (
      backfill === null ||
      backfill.status !== "running" ||
      (await isWorkspaceDeleting(ctx, backfill.organizationId))
    ) {
      return
    }

    const integration = await ctx.db.get(backfill.integrationId)

    if (integration === null) {
      return
    }

    let recorded = 0
    let duplicates = 0

    for (const event of args.events) {
      const result = await recordBackfillEvent(ctx, { integration, ...event })

      if (result.status === "recorded") {
        recorded += 1
      } else {
        duplicates += 1
      }
    }

    await ctx.db.patch(args.backfillId, {
      stats: {
        events: backfill.stats.events + recorded,
        duplicates: backfill.stats.duplicates + duplicates,
        steps: backfill.stats.steps,
      },
    })
  },
})

export const advance = internalMutation({
  args: {
    backfillId: v.id("backfills"),
    cursor: v.optional(backfillCursor),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const backfill = await ctx.db.get(args.backfillId)

    if (
      backfill === null ||
      backfill.status !== "running" ||
      (await isWorkspaceDeleting(ctx, backfill.organizationId))
    ) {
      return
    }

    await ctx.db.patch(args.backfillId, {
      cursor: args.cursor,
      stats: { ...backfill.stats, steps: backfill.stats.steps + 1 },
      ...(args.completed
        ? { status: "completed" as const, endedAt: Date.now() }
        : {}),
    })
  },
})

export const fail = internalMutation({
  args: { backfillId: v.id("backfills"), error: v.string() },
  handler: async (ctx, args) => {
    const backfill = await ctx.db.get(args.backfillId)

    if (backfill !== null && backfill.status === "running") {
      await ctx.db.patch(args.backfillId, {
        status: "failed",
        error: args.error,
        endedAt: Date.now(),
      })
    }
  },
})

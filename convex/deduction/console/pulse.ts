import { v } from "convex/values"
import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx, query } from "../../_generated/server"
import { checkTenantAccess } from "../../identity/access"
import { activeEffortRows } from "../effort/input"
import { latestCompletedPass } from "../engine/pass"
import {
  consolidationCadenceMs,
  effortActiveMs,
  maxConsolidationEfforts,
} from "../limits"
import { beliefKinds } from "../schema"

// The workstreams page's activity strip: recent journal entries tagged with
// their effort's current workstream (null = not yet placed), plus the review
// heartbeat. Lane labels come from the roster the page already loads, so
// this stays a pure activity read.

const defaultWindowDays = 14
const dayMs = 24 * 60 * 60 * 1000

export const read = query({
  args: {
    tenantId: v.string(),
    days: v.optional(v.union(v.literal(14), v.literal(30), v.literal(60))),
  },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)

    if (!access.ok) {
      return null
    }

    const days = args.days ?? defaultWindowDays
    const now = Date.now()
    // Any effort sighted inside the view window may own entries in it, so
    // the range read reaches past dormancy; the unplaced count stays scoped
    // to the active layer, matching what the judges still see.
    const efforts = await activeEffortRows(
      ctx,
      args.tenantId,
      maxConsolidationEfforts,
      now - days * dayMs
    )
    const activeCutoff = now - effortActiveMs

    return {
      now,
      days,
      entries: await windowEntries(ctx, efforts, days, now - days * dayMs),
      unplaced: efforts.filter(
        (row) => row.workstreamId === undefined && row.seenAt > activeCutoff
      ).length,
      reviewedAt: await lastReviewedAt(ctx, args.tenantId),
      consolidationAt: await nextConsolidationAt(ctx, args.tenantId),
    }
  },
})

// Journal entries inside the window, read per effort so each entry carries
// live membership rather than the write-time stamp. The per-effort take
// scales with the window so long views stay bounded without going blank.
async function windowEntries(
  ctx: QueryCtx,
  efforts: Doc<"efforts">[],
  days: number,
  since: number
) {
  const entryLimit = days * 2
  const perEffort = await Promise.all(
    efforts.map(async (effort) => {
      const rows = await ctx.db
        .query("journal")
        .withIndex("by_effort_and_observed_at", (index) =>
          index.eq("effortId", effort._id).gt("observedAt", since)
        )
        .order("desc")
        .take(entryLimit)

      return rows.map((row) => ({
        observedAt: row.observedAt,
        effort: effort.name,
        workstreamId: effort.workstreamId ?? null,
      }))
    })
  )

  return perEffort.flat()
}

async function lastReviewedAt(ctx: QueryCtx, tenantId: string) {
  const pass = await latestCompletedPass(ctx, {
    tenantId,
    stage: "effort",
    scope: "window",
  })

  return pass === null ? null : (pass.endedAt ?? pass.startedAt)
}

// The soonest due consolidation across belief kinds; cadence measures from
// the last reviewed window's end, mirroring the scheduler.
async function nextConsolidationAt(ctx: QueryCtx, tenantId: string) {
  const dueTimes = await Promise.all(
    beliefKinds.map(async (kind) => {
      const pass = await latestCompletedPass(ctx, {
        tenantId,
        stage: kind,
        scope: "full",
      })

      return pass === null ? null : pass.window.end + consolidationCadenceMs
    })
  )
  const known = dueTimes.filter((value): value is number => value !== null)

  return known.length === 0 ? null : Math.min(...known)
}

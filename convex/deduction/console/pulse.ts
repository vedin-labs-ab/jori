import { v } from "convex/values"
import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx, query } from "../../_generated/server"
import { checkTenantAccess } from "../../identity/access"
import { activeEffortRows } from "../effort/input"
import { latestCompletedPass } from "../engine/pass"
import { consolidationCadenceMs, maxContextEfforts } from "../limits"
import { beliefKinds } from "../schema"

// The workstreams page's activity strip: recent journal entries tagged with
// their effort's current workstream (null = not yet placed), plus the review
// heartbeat. Lane labels come from the roster the page already loads, so
// this stays a pure activity read.

const pulseWindowDays = 14
const dayMs = 24 * 60 * 60 * 1000
const entriesPerEffort = 30

export const read = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)

    if (!access.ok) {
      return null
    }

    const now = Date.now()
    const efforts = await activeEffortRows(
      ctx,
      args.tenantId,
      maxContextEfforts
    )

    return {
      now,
      entries: await windowEntries(ctx, efforts, now - pulseWindowDays * dayMs),
      unplaced: efforts.filter((row) => row.workstreamId === undefined).length,
      reviewedAt: await lastReviewedAt(ctx, args.tenantId),
      consolidationAt: await nextConsolidationAt(ctx, args.tenantId),
    }
  },
})

// Journal entries inside the window, read per active effort so each entry
// carries live membership rather than the write-time stamp.
async function windowEntries(
  ctx: QueryCtx,
  efforts: Doc<"efforts">[],
  since: number
) {
  const perEffort = await Promise.all(
    efforts.map(async (effort) => {
      const rows = await ctx.db
        .query("journal")
        .withIndex("by_effort_and_observed_at", (index) =>
          index.eq("effortId", effort._id).gt("observedAt", since)
        )
        .order("desc")
        .take(entriesPerEffort)

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

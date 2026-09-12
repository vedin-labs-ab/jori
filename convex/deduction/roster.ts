import { type QueryCtx } from "../_generated/server"
import { deductionPaused, maxRosterEntries, rosterRecencyMs } from "./limits"

// The slice of the roster that grounds runs: confirmed workstreams with a
// sighting inside the rolling window, newest sighting first, capped. Proposed
// beliefs never reach runs; that is the point of the status. Timestamps ride
// along so the prompt can render ages: createdAt is when Jori started
// tracking the workstream, not when the work began.
export type WorkstreamContext = {
  name: string
  brief: string
  createdAt: number
  seenAt: number
}

/** The confirmed, unsuperseded workstreams seen inside the rolling window,
 *  newest sighting first, capped. */
export async function confirmedWorkstreams(
  ctx: QueryCtx,
  organizationId: string,
  now: number
) {
  if (deductionPaused) {
    return []
  }

  const rows = await ctx.db
    .query("beliefs")
    .withIndex("by_organization_and_kind_and_status", (index) =>
      index
        .eq("organizationId", organizationId)
        .eq("kind", "workstream")
        .eq("status", "confirmed")
    )
    .collect()

  return rows
    .filter(
      (row) =>
        row.supersededBy === undefined && now - row.seenAt <= rosterRecencyMs
    )
    .sort((left, right) => right.seenAt - left.seenAt)
    .slice(0, maxRosterEntries)
}

export async function readWorkstreamRoster(
  ctx: QueryCtx,
  organizationId: string
): Promise<WorkstreamContext[]> {
  const rows = await confirmedWorkstreams(ctx, organizationId, Date.now())

  return rows.map((row) => ({
    name: row.name,
    brief: row.brief,
    createdAt: row.createdAt,
    seenAt: row.seenAt,
  }))
}

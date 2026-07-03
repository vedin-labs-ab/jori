import { type QueryCtx } from "../_generated/server"
import { rosterRecencyMs } from "./limits"

// The slice of the roster that grounds runs: confirmed workstreams with a
// recent sighting, projected to what a prompt needs. Proposed beliefs never
// reach runs; that is the point of the status.
export type WorkstreamContext = {
  name: string
  brief: string
}

export async function readWorkstreamRoster(
  ctx: QueryCtx,
  tenantId: string
): Promise<WorkstreamContext[]> {
  const now = Date.now()
  const rows = await ctx.db
    .query("beliefs")
    .withIndex("by_tenant_and_kind_and_status", (index) =>
      index
        .eq("tenantId", tenantId)
        .eq("kind", "workstream")
        .eq("status", "confirmed")
    )
    .collect()

  return rows
    .filter(
      (row) =>
        row.supersededBy === undefined && now - row.seenAt <= rosterRecencyMs
    )
    .map((row) => ({ name: row.name, brief: row.brief }))
}

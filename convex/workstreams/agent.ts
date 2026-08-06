import { type ObjectType, v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../_generated/server"
import { maxRosterEntries, rosterRecencyMs } from "../deduction/limits"
import { effortNames, eventUrl } from "./read"

// The agent's read over the workstream memory: the confirmed roster with each
// workstream's journal window and citation links. One call carries what a
// weekly pre-read needs; workstreams with an empty window are the stall
// signal, so they stay in the response rather than being filtered out.

const dayMs = 24 * 60 * 60 * 1000
const defaultWindowDays = 7
const maxWindowDays = 60
const entriesPerWorkstream = 12
const receiptsPerEntry = 3
const evidencePerWorkstream = 200

export const readWorkstreamsArgs = {
  organizationId: v.string(),
  days: v.optional(v.number()),
}
export type ReadWorkstreamsArgs = ObjectType<typeof readWorkstreamsArgs>

export const readWorkstreams = internalQuery({
  args: readWorkstreamsArgs,
  handler: async (ctx, args) => {
    const now = Date.now()
    const days = Math.min(
      Math.max(Math.floor(args.days ?? defaultWindowDays), 1),
      maxWindowDays
    )
    const since = now - days * dayMs
    const roster = await confirmedRoster(ctx, args.organizationId, now)
    const workstreams = await Promise.all(
      roster.map((belief) => readWindow(ctx, belief, since))
    )

    return { now, days, workstreams }
  },
})

/** The same selection rules as the run-context roster, keeping the ids the
 *  prompt projection deliberately drops. */
async function confirmedRoster(
  ctx: QueryCtx,
  organizationId: string,
  now: number
) {
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
    .sort((first, second) => second.seenAt - first.seenAt)
    .slice(0, maxRosterEntries)
}

async function readWindow(
  ctx: QueryCtx,
  belief: Doc<"beliefs">,
  since: number
) {
  const names = await effortNames(ctx, belief._id)
  const receipts = await windowReceipts(ctx, belief._id, since)
  const rows = await ctx.db
    .query("journal")
    .withIndex("by_workstream_and_observed_at", (index) =>
      index.eq("workstreamId", belief._id).gt("observedAt", since)
    )
    .order("desc")
    .take(entriesPerWorkstream)
  const entries = await Promise.all(
    rows.map(async (row) => ({
      entry: row.entry,
      observedAt: row.observedAt,
      effort: names.get(row.effortId) ?? "",
      receipts: await resolveReceipts(
        ctx,
        receipts.get(`${row.effortId}:${row.passId}`) ?? []
      ),
    }))
  )

  return {
    workstreamId: belief._id,
    name: belief.name,
    brief: belief.brief,
    seenAt: belief.seenAt,
    sources: belief.sources ?? [],
    entries,
  }
}

/** Evidence in the window, grouped the way journal entries cite it: the rows
 *  written by the same pass for the same effort are the entry's receipts. */
async function windowReceipts(
  ctx: QueryCtx,
  beliefId: Id<"beliefs">,
  since: number
) {
  const rows = await ctx.db
    .query("evidence")
    .withIndex("by_workstream_and_observed_at", (index) =>
      index.eq("workstreamId", beliefId).gt("observedAt", since)
    )
    .order("desc")
    .take(evidencePerWorkstream)
  const grouped = new Map<string, Doc<"evidence">[]>()

  for (const row of rows) {
    if (row.subject.kind !== "effort") {
      continue
    }

    const key = `${row.subject.effortId}:${row.passId}`
    const group = grouped.get(key) ?? []

    if (group.length < receiptsPerEntry) {
      group.push(row)
      grouped.set(key, group)
    }
  }

  return grouped
}

async function resolveReceipts(ctx: QueryCtx, rows: Doc<"evidence">[]) {
  return await Promise.all(
    rows.map(async (row) => ({
      why: row.why,
      integration: row.integration ?? null,
      url:
        row.reference.kind === "event"
          ? (eventUrl((await ctx.db.get(row.reference.eventId))?.data) ?? null)
          : null,
    }))
  )
}

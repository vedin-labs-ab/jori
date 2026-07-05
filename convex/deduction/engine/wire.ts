import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type AllowedSources, type SourceRecord } from "./rules"

// The action-to-applier boundary: the run action serializes what the judge
// was shown as plain rows, and the applier rebuilds the lookup maps it
// validates citations against.

export const allowedSource = v.object({
  id: v.string(),
  observedAt: v.number(),
  integrationId: v.optional(v.string()),
})

type AllowedRow = { id: string; observedAt: number; integrationId?: string }

export type AllowedRows = {
  events?: AllowedRow[]
  conversations?: AllowedRow[]
  efforts?: AllowedRow[]
}

export function toAllowedMaps(rows: AllowedRows): AllowedSources {
  return {
    events: toMap(rows.events),
    conversations: toMap(rows.conversations),
    efforts: toMap(rows.efforts),
  }
}

function toMap(rows: AllowedRow[] | undefined) {
  return new Map<string, SourceRecord>(
    (rows ?? []).map((row) => [
      row.id,
      { observedAt: row.observedAt, integrationId: row.integrationId },
    ])
  )
}

// Every stage reports the same counters; a stage that never performs an op
// simply leaves its counter at zero. Discards start at the parse failures
// the action already counted.
export function statCounts(args: {
  context: number
  activity: number
  invalid: number
}) {
  return {
    context: args.context,
    activity: args.activity,
    created: 0,
    updated: 0,
    merged: 0,
    closed: 0,
    assigned: 0,
    discarded: args.invalid,
  }
}

// Appliers are idempotent against re-delivery: only a still-running pass is
// applied, so a duplicate or late apply is a no-op.
export async function requireRunningPass(
  ctx: MutationCtx,
  passId: Id<"passes">
): Promise<Doc<"passes"> | null> {
  const pass = await ctx.db.get(passId)

  return pass !== null && pass.status === "running" ? pass : null
}

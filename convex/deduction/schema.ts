import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { actorValidator } from "../shared/actor"

// Kinds the pipeline can deduce. Keep the array, the validator, and the
// beliefs union members in sync; schema.test.ts pins the equivalence.
export const beliefKinds = ["workstream"] as const
export const beliefKind = v.union(v.literal("workstream"))
export type BeliefKind = Infer<typeof beliefKind>

export const beliefStatus = v.union(
  v.literal("proposed"), // judge sees it; runs don't
  v.literal("confirmed"), // in the roster, grounds run context
  v.literal("closed"), // work concluded; kept for history
  v.literal("rejected") // not a real thing; kept so the judge stops re-proposing it
)
export type BeliefStatus = Infer<typeof beliefStatus>

export const passWindow = v.object({ start: v.number(), end: v.number() })

// Fields every belief kind shares. Kind-specific fields live inline in the
// union member, so `kind` is stated exactly once per row.
const beliefFields = {
  tenantId: v.string(),
  name: v.string(),
  aliases: v.array(v.string()),
  status: beliefStatus,
  supersededBy: v.optional(v.id("beliefs")),
  lockedBy: v.optional(actorValidator),
  seenAt: v.number(), // latest supporting sighting; applier-derived, never judge-supplied
  createdAt: v.number(),
  updatedAt: v.number(),
}

// What Milo currently thinks exists. The only mutable table in the module:
// written by pass application and console corrections, nothing else. A belief
// with supersededBy set is out of the roster whatever its status.
export const beliefs = defineTable(
  v.union(
    v.object({
      ...beliefFields,
      kind: v.literal("workstream"),
      brief: v.string(),
      parentId: v.optional(v.id("beliefs")),
    })
    // Future kinds ("team", ...) add members here.
  )
).index("by_tenant_and_kind_and_status", ["tenantId", "kind", "status"])

// Source pointers only: evidence ties a belief to a record in a source-of-
// record table, never to another belief.
export const evidenceReference = v.union(
  v.object({ kind: v.literal("event"), eventId: v.id("events") }),
  v.object({
    kind: v.literal("conversation"),
    conversationId: v.id("conversations"),
    summarizedAt: v.number(),
  })
)

// Sightings, not unique links: the judge cites a source again whenever it
// offers new support, and repeat citations are what advance seenAt. `why`
// carries the claim as read at citation time; the reference stays a live
// pointer into the source.
export const evidence = defineTable({
  tenantId: v.string(),
  beliefId: v.id("beliefs"),
  passId: v.id("passes"),
  reference: evidenceReference,
  why: v.string(),
  observedAt: v.number(),
}).index("by_belief", ["beliefId"])

// Dated narrative per belief, append-only. createdAt is when the entry was
// written; the narrated period is the citing pass's window.
export const journal = defineTable({
  tenantId: v.string(),
  beliefId: v.id("beliefs"),
  passId: v.id("passes"),
  entry: v.string(),
  createdAt: v.number(),
})
  .index("by_belief_and_created_at", ["beliefId", "createdAt"])
  .index("by_tenant_and_created_at", ["tenantId", "createdAt"])

export const passStatus = v.union(
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed")
)

// One judged review per kind per window: ledger, cursor, and idempotency in
// one row. Windows derive from completed passes only and range over event
// ingestion time, so late-arriving webhooks are never skipped.
export const passes = defineTable({
  tenantId: v.string(),
  kind: beliefKind,
  status: passStatus,
  window: passWindow,
  prompt: v.object({ version: v.string(), model: v.string() }),
  stats: v.optional(
    v.object({
      beliefs: v.number(),
      events: v.number(),
      conversations: v.number(),
      created: v.number(),
      updated: v.number(),
      merged: v.number(),
      closed: v.number(),
      discarded: v.number(), // judge mutations the applier refused
    })
  ),
  error: v.optional(v.string()),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
}).index("by_tenant_and_kind_and_started_at", ["tenantId", "kind", "startedAt"])

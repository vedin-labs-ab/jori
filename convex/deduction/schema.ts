import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { actorValidator } from "../shared/actor"
import { integrationValidator } from "../shared/integrations"

// Kinds the pipeline can deduce. Keep the array, the validator, and the
// beliefs union members in sync; schema.test.ts pins the equivalence.
export const beliefKinds = ["workstream"] as const
export const beliefKind = v.union(v.literal("workstream"))
export type BeliefKind = Infer<typeof beliefKind>

// Review stages: the kind-neutral effort review, then one review per belief
// kind. Each stage cites only the layer below it.
export const passStages = ["effort", ...beliefKinds] as const
export const passStage = v.union(v.literal("effort"), v.literal("workstream"))
export type PassStage = Infer<typeof passStage>

// Window passes review new activity incrementally; full passes review the
// whole active layer for restructuring. Only belief stages run full passes.
export const passScope = v.union(v.literal("window"), v.literal("full"))
export type PassScope = Infer<typeof passScope>

export const beliefStatus = v.union(
  v.literal("proposed"), // judge sees it; runs don't
  v.literal("confirmed"), // in the roster, grounds run context
  v.literal("closed"), // work concluded; kept for history
  v.literal("rejected") // not a real thing; kept so the judge stops re-proposing it
)
export type BeliefStatus = Infer<typeof beliefStatus>

export const passWindow = v.object({ start: v.number(), end: v.number() })

// The kind-neutral middle layer: small, concrete units of work clustered from
// raw activity. Membership in a workstream is a mutable assignment, never a
// birth property; that is what keeps restructuring cheap. seenAt, anchors,
// and actors are applier-derived from cited evidence, never judge-supplied.
export const efforts = defineTable({
  tenantId: v.string(),
  name: v.string(),
  summary: v.string(),
  anchors: v.array(v.string()),
  actors: v.array(v.string()),
  sources: v.array(integrationValidator),
  workstreamId: v.optional(v.id("beliefs")),
  supersededBy: v.optional(v.id("efforts")),
  seenAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_tenant_and_seen_at", ["tenantId", "seenAt"])
  .index("by_tenant_and_updated_at", ["tenantId", "updatedAt"])
  .index("by_workstream", ["workstreamId"])

// Fields every belief kind shares. Kind-specific fields live inline in the
// union member, so `kind` is stated exactly once per row.
const beliefFields = {
  tenantId: v.string(),
  name: v.string(),
  aliases: v.array(v.string()),
  status: beliefStatus,
  supersededBy: v.optional(v.id("beliefs")),
  lockedBy: v.optional(actorValidator),
  // Rollups of assigned efforts' anchors and source integrations;
  // applier-derived, never judge-supplied. Sources power the console chips
  // without an evidence walk.
  anchors: v.optional(v.array(v.string())),
  sources: v.optional(v.array(integrationValidator)),
  seenAt: v.number(), // latest supporting sighting; applier-derived
  createdAt: v.number(),
  updatedAt: v.number(),
}

// What Milo currently thinks exists. Beliefs and efforts are the only mutable
// tables in the module: written by pass application and console corrections,
// nothing else. A row with supersededBy set is out of the roster whatever its
// status.
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

// Each layer cites only the layer below: effort evidence references events
// and conversations, belief evidence references efforts. Citations still
// ground out in source records, transitively.
export const evidenceSubject = v.union(
  v.object({ kind: v.literal("belief"), beliefId: v.id("beliefs") }),
  v.object({ kind: v.literal("effort"), effortId: v.id("efforts") })
)
export type EvidenceSubject = Infer<typeof evidenceSubject>

export const evidenceReference = v.union(
  v.object({ kind: v.literal("event"), eventId: v.id("events") }),
  v.object({
    kind: v.literal("conversation"),
    conversationId: v.id("conversations"),
    summarizedAt: v.number(),
  }),
  v.object({ kind: v.literal("effort"), effortId: v.id("efforts") })
)

// Sightings, not unique links: the judge cites a source again whenever it
// offers new support, and repeat citations are what advance seenAt. `why`
// carries the claim as read at citation time; the reference stays a live
// pointer into the source.
export const evidence = defineTable({
  tenantId: v.string(),
  subject: evidenceSubject,
  passId: v.id("passes"),
  reference: evidenceReference,
  why: v.string(),
  observedAt: v.number(),
  // Read-model stamp on effort-subject rows: the owning workstream, kept in
  // step with membership so the console pages one index range per
  // workstream. Belief-subject rows carry no stamp.
  workstreamId: v.optional(v.id("beliefs")),
})
  .index("by_subject_belief_id", ["subject.beliefId"])
  .index("by_subject_effort_id", ["subject.effortId"])
  .index("by_reference_effort_id", ["reference.effortId"])
  .index("by_workstream_and_observed_at", ["workstreamId", "observedAt"])

// Dated narrative per effort, append-only. A workstream's timeline is a view
// over its assigned efforts' journals, so narrative moves with membership.
export const journal = defineTable({
  tenantId: v.string(),
  effortId: v.id("efforts"),
  passId: v.id("passes"),
  entry: v.string(),
  createdAt: v.number(),
  // Same read-model stamp as evidence: the owning workstream at write or
  // last membership change.
  workstreamId: v.optional(v.id("beliefs")),
})
  .index("by_effort_and_created_at", ["effortId", "createdAt"])
  .index("by_tenant_and_created_at", ["tenantId", "createdAt"])
  .index("by_workstream_and_created_at", ["workstreamId", "createdAt"])

export const passStatus = v.union(
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed")
)

// One judged review per stage, scope, and window: ledger, cursor, and
// idempotency in one row. Windows derive from completed passes only; the
// effort stage ranges over event ingestion time and belief stages over
// effort update time, so late arrivals are never skipped.
export const passes = defineTable({
  tenantId: v.string(),
  stage: passStage,
  scope: passScope,
  status: passStatus,
  window: passWindow,
  prompt: v.object({ version: v.string(), model: v.string() }),
  stats: v.optional(
    v.object({
      context: v.number(), // prior rows shown to the judge
      activity: v.number(), // window records under review
      created: v.number(),
      updated: v.number(),
      merged: v.number(),
      closed: v.number(),
      assigned: v.number(),
      discarded: v.number(), // judge mutations the applier refused
    })
  ),
  error: v.optional(v.string()),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
}).index("by_tenant_and_stage_and_scope_and_started_at", [
  "tenantId",
  "stage",
  "scope",
  "startedAt",
])

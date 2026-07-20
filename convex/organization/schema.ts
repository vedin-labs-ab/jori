import { defineTable } from "convex/server"
import { v } from "convex/values"
import { actorValidator } from "../shared/actor"

// The durable identity facts about an organization. This single shape is reused
// three ways: the live (approved) columns on the profile, the pending draft, and
// the model's structured-output contract during discovery.
const factsFields = {
  name: v.optional(v.string()),
  aliases: v.array(v.string()),
  domains: v.array(v.string()),
  summary: v.optional(v.string()),
}

export const organizationFacts = v.object(factsFields)

export const organizationSourceSnapshot = v.object({
  url: v.string(),
  primary: v.boolean(),
  hash: v.optional(v.string()),
})

// One row per organization, three provenance spaces: top-level fields are
// live/approved and read on the hot path; `proposed` holds a draft awaiting
// human approval (absent when none); `declared` holds facts the user states
// directly — user-owned, effective immediately, and never touched by
// discovery, drafts, or approval. Deliberately narrower than factsFields:
// each declared field must earn its place with its own merge semantics.
export const organizationProfile = defineTable({
  organizationId: v.string(),
  ...factsFields,
  proposed: v.optional(
    v.object({
      ...factsFields,
      generatedAt: v.number(),
      sources: v.optional(v.array(organizationSourceSnapshot)),
      website: v.optional(v.string()),
    })
  ),
  declared: v.optional(v.object({ domains: v.array(v.string()) })),
  approvedAt: v.optional(v.number()),
  approvedBy: v.optional(actorValidator),
  updatedAt: v.number(),
}).index("by_organization", ["organizationId"])

// First-party pages we crawl for an organization. `hash` is the normalized-text
// fingerprint that gates re-drafting; `checkAt` is the watcher's due time.
export const organizationSources = defineTable({
  organizationId: v.string(),
  url: v.string(),
  primary: v.boolean(),
  hash: v.optional(v.string()),
  changedAt: v.optional(v.number()),
  checkAt: v.number(),
})
  .index("by_organization_and_url", ["organizationId", "url"])
  .index("by_check_at", ["checkAt"])

export const discoveryStepKind = v.union(
  v.literal("page"),
  v.literal("summary")
)

const discoveryStep = v.object({
  activeAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  error: v.optional(v.string()),
  id: v.optional(v.string()),
  kind: discoveryStepKind,
  label: v.string(),
  queuedAt: v.optional(v.number()),
  startedAt: v.optional(v.number()),
  url: v.optional(v.string()),
})

const discoveryStatus = v.union(v.literal("running"), v.literal("completed"))

// High-churn progress for the latest discovery run, kept separate from the
// stable profile so live updates never contend with the hot read path. One row
// per organization; each run resets it.
export const organizationDiscovery = defineTable({
  organizationId: v.string(),
  status: discoveryStatus,
  steps: v.array(discoveryStep),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
  errors: v.array(v.string()),
}).index("by_organization", ["organizationId"])

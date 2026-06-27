import { defineTable } from "convex/server"
import { v } from "convex/values"

// The durable identity facts about an organization. This single shape is reused
// three ways: the live (approved) columns on the profile, the pending draft, and
// the model's structured-output contract during discovery.
export const factsFields = {
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

// One row per tenant. Top-level fields are live/approved and read on the hot
// path; `proposed` holds a draft awaiting human approval (absent when none).
export const organizationProfile = defineTable({
  tenantId: v.string(),
  ...factsFields,
  proposed: v.optional(
    v.object({
      ...factsFields,
      generatedAt: v.number(),
      sources: v.optional(v.array(organizationSourceSnapshot)),
      website: v.optional(v.string()),
    })
  ),
  approvedAt: v.optional(v.number()),
  updatedAt: v.number(),
}).index("by_tenant", ["tenantId"])

// First-party pages we crawl for an organization. `hash` is the normalized-text
// fingerprint that gates re-drafting; `checkAt` is the watcher's due time.
export const organizationSources = defineTable({
  tenantId: v.string(),
  url: v.string(),
  primary: v.boolean(),
  hash: v.optional(v.string()),
  changedAt: v.optional(v.number()),
  checkAt: v.number(),
})
  .index("by_tenant_and_url", ["tenantId", "url"])
  .index("by_check_at", ["checkAt"])

export const discoveryStepKind = v.union(
  v.literal("page"),
  v.literal("summary")
)

export const discoveryStep = v.object({
  completedAt: v.optional(v.number()),
  error: v.optional(v.string()),
  kind: discoveryStepKind,
  label: v.string(),
  startedAt: v.number(),
  url: v.optional(v.string()),
})

export const discoveryStatus = v.union(
  v.literal("running"),
  v.literal("completed")
)

// High-churn progress for the latest discovery run, kept separate from the
// stable profile so live updates never contend with the hot read path. One row
// per tenant; each run resets it.
export const organizationDiscovery = defineTable({
  tenantId: v.string(),
  status: discoveryStatus,
  steps: v.array(discoveryStep),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
  errors: v.array(v.string()),
}).index("by_tenant", ["tenantId"])

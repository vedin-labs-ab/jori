import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"

// Sections a place profile is organized by: what the place is for, who is
// active there, how people write, how work recurs, and what Milo is asked to
// do. Keep the array and the validator in sync.
export const placeSections = [
  "purpose",
  "people",
  "language",
  "rhythm",
  "milo",
] as const
export const placeSection = v.union(
  v.literal("purpose"),
  v.literal("people"),
  v.literal("language"),
  v.literal("rhythm"),
  v.literal("milo")
)
export type PlaceSection = Infer<typeof placeSection>

// One durable norm of the place. The model judges claims against each
// message window; the lifecycle fields are code-owned: confirmedAt records
// the last supporting window, misses counts consecutive windows that said
// nothing either way. Passes only run on traffic, so misses is a
// traffic-gated clock — quiet weeks age nothing.
export const placeClaim = v.object({
  section: placeSection,
  text: v.string(),
  confirmedAt: v.number(),
  misses: v.number(),
})
export type PlaceClaim = Infer<typeof placeClaim>

export const placeVisibility = v.union(
  v.literal("public"),
  v.literal("private")
)
export type PlaceVisibility = Infer<typeof placeVisibility>

// A place is a durable, shared container of recurring work — a Slack
// channel today; repositories and teams can join without schema changes.
// Rows are observed at message intake, never deduced; only the claims are
// distilled. A run reads exactly one place, the one its message landed in,
// so private-place claims never travel.
export const places = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  externalId: v.string(),
  name: v.string(),
  visibility: placeVisibility,
  claims: v.array(placeClaim),
  // Watermark: createdAt of the newest message the profile has seen.
  profiledAt: v.optional(v.number()),
  // Debounce state, mirroring conversation summaries.
  profileAt: v.optional(v.number()),
  functionId: v.optional(v.id("_scheduled_functions")),
}).index("by_tenant_and_integration_and_external", [
  "tenantId",
  "integrationId",
  "externalId",
])

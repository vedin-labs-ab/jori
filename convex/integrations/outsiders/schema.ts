import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"

export const outsiderAttempt = v.union(
  v.literal("message"),
  v.literal("reaction"),
  v.literal("approval")
)

export type OutsiderAttempt = Infer<typeof outsiderAttempt>

// The audit trail of writers Jori ignored: one row per outsider on a
// connection, counting attempts. It never holds what they wrote.
export const outsiders = defineTable({
  organizationId: v.string(),
  integrationId: v.id("integrations"),
  externalId: v.string(),
  name: v.optional(v.string()),
  /** The provider placed them outside the installed workspace. Absent for
   *  a workspace insider who is not a member of the organization. */
  external: v.optional(v.boolean()),
  attempts: v.number(),
  last: v.object({
    attempt: outsiderAttempt,
    conversationId: v.optional(v.string()),
    at: v.number(),
  }),
  createdAt: v.number(),
})
  .index("by_integration_and_external", ["integrationId", "externalId"])
  .index("by_organization", ["organizationId"])

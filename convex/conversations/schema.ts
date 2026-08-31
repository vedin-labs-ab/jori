import { defineTable } from "convex/server"
import { v } from "convex/values"
import { audienceValidator } from "../shared/audience"

export const conversations = defineTable({
  organizationId: v.string(),
  integrationId: v.id("integrations"),
  externalId: v.string(),
  scope: audienceValidator,
  summary: v.optional(v.string()),
  summarizedAt: v.optional(v.number()),
  /** Debounce state while a pass is scheduled: the pending function and the
   *  ceiling it may not be pushed past. Cleared when the pass runs. */
  debounce: v.optional(
    v.object({
      ceilingAt: v.number(),
      functionId: v.id("_scheduled_functions"),
    })
  ),
})
  .index("by_organization_and_integration_and_external", [
    "organizationId",
    "integrationId",
    "externalId",
  ])
  .index("by_organization_and_summarized_at", [
    "organizationId",
    "summarizedAt",
  ])

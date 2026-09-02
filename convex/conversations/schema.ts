import { defineTable } from "convex/server"
import { v } from "convex/values"
import { audienceValidator } from "../shared/audience"
import { debounceValidator } from "../shared/debounce"

export const conversations = defineTable({
  organizationId: v.string(),
  integrationId: v.id("integrations"),
  externalId: v.string(),
  scope: audienceValidator,
  summary: v.optional(v.string()),
  summarizedAt: v.optional(v.number()),
  debounce: debounceValidator,
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

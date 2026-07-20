import { defineTable } from "convex/server"
import { v } from "convex/values"
import { audienceScopeValidator } from "../shared/audience"

export const conversations = defineTable({
  organizationId: v.string(),
  integrationId: v.id("integrations"),
  externalId: v.string(),
  scope: audienceScopeValidator,
  summary: v.optional(v.string()),
  summarizedAt: v.optional(v.number()),
  functionId: v.optional(v.id("_scheduled_functions")),
  summarizeAt: v.optional(v.number()),
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

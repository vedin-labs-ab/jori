import { defineTable } from "convex/server"
import { v } from "convex/values"
import { integrationValidator } from "../integrations/catalog"
import { actorValidator } from "../shared/actor"
import { sourceMetadataValidator } from "../shared/sources/schema"

const eventCriteriaValue = v.union(v.string(), v.number())
const eventCriteria = v.record(v.string(), eventCriteriaValue)

export const events = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  integration: integrationValidator,
  key: v.string(),
  type: v.string(),
  resource: v.optional(v.string()),
  criteria: v.optional(eventCriteria),
  actor: v.optional(actorValidator),
  text: v.optional(v.string()),
  data: v.optional(v.any()),
  metadata: sourceMetadataValidator,
  observedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_integration_and_key", ["integrationId", "key"])
  .index("by_tenant", ["tenantId"])

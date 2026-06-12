import { defineTable } from "convex/server"
import { v } from "convex/values"
import { actorValidator } from "../shared/actor"

export const events = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  key: v.string(),
  type: v.string(),
  resource: v.optional(v.string()),
  actor: v.optional(actorValidator),
  text: v.optional(v.string()),
  data: v.optional(v.any()),
  observedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_integration_and_key", ["integrationId", "key"])
  .index("by_tenant", ["tenantId"])

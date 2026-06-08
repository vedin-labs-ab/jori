import { defineTable } from "convex/server"
import { v } from "convex/values"

export const messages = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  type: v.string(),
  providerId: v.string(),
  actorId: v.optional(v.string()),
  containerId: v.optional(v.string()),
  threadId: v.optional(v.string()),
  text: v.optional(v.string()),
  data: v.optional(v.any()),
  occurredAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_provider_id", ["providerId"])
  .index("by_thread", ["tenantId", "integrationId", "threadId"])

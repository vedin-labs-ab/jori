import { defineTable } from "convex/server"
import { v } from "convex/values"

export const messages = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  type: v.string(),
  externalId: v.string(),
  actorId: v.optional(v.string()),
  actorEmail: v.optional(v.string()),
  conversationId: v.optional(v.string()),
  text: v.optional(v.string()),
  data: v.optional(v.any()),
  observedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_external_id", ["externalId"])
  .index("by_conversation", ["tenantId", "integrationId", "conversationId"])

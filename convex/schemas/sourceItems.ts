import { defineTable } from "convex/server"
import { v } from "convex/values"

export const sourceItems = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  kind: v.string(),
  externalId: v.string(),
  authorId: v.optional(v.string()),
  locationId: v.optional(v.string()),
  conversationId: v.optional(v.string()),
  content: v.optional(v.string()),
  data: v.optional(v.any()),
  observedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_external_id", ["externalId"])
  .index("by_conversation", ["tenantId", "integrationId", "conversationId"])

import { defineTable } from "convex/server"
import { v } from "convex/values"

export const conversations = defineTable({
  tenantId: v.string(),
  integrationId: v.id("integrations"),
  conversationId: v.string(),
  rootRunId: v.id("runs"),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_conversation", ["tenantId", "integrationId", "conversationId"])

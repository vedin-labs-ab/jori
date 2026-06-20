import { defineTable } from "convex/server"
import { v } from "convex/values"

export const sessions = defineTable({
  tenantId: v.string(),
  conversationId: v.id("conversations"),
  state: v.union(v.literal("active"), v.literal("idle")),
  runId: v.optional(v.id("runs")),
  lastConsumedMessageId: v.optional(v.id("messages")),
  lastConsumedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_conversation", ["conversationId"])
  .index("by_run", ["runId"])
  .index("by_tenant", ["tenantId"])

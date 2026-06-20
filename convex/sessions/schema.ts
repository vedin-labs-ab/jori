import { defineTable } from "convex/server"
import { v } from "convex/values"

export const sessions = defineTable({
  conversationId: v.id("conversations"),
  runId: v.optional(v.id("runs")),
  cursor: v.optional(
    v.object({
      messageId: v.id("messages"),
      timestamp: v.number(),
    })
  ),
  updatedAt: v.number(),
})
  .index("by_conversation", ["conversationId"])
  .index("by_run", ["runId"])

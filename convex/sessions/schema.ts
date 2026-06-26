import { defineTable } from "convex/server"
import { v } from "convex/values"

export const sessions = defineTable({
  watchId: v.id("watches"),
  runId: v.optional(v.id("runs")),
  cursor: v.optional(
    v.object({
      messageId: v.id("messages"),
      timestamp: v.number(),
    })
  ),
  reactionCursor: v.optional(
    v.object({
      reactionId: v.optional(v.id("reactions")),
      timestamp: v.number(),
    })
  ),
  updatedAt: v.number(),
})
  .index("by_watch", ["watchId"])
  .index("by_run", ["runId"])

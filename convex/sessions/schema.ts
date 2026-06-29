import { defineTable } from "convex/server"
import { v } from "convex/values"

const messageSubcursor = v.object({
  createdAt: v.number(),
  messageId: v.id("messages"),
})

const reactionSubcursor = v.object({
  createdAt: v.optional(v.number()),
  updatedAt: v.number(),
})

export const sessions = defineTable({
  watchId: v.id("watches"),
  runId: v.optional(v.id("runs")),
  cursor: v.optional(
    v.object({
      message: v.optional(messageSubcursor),
      reaction: v.optional(reactionSubcursor),
    })
  ),
  updatedAt: v.number(),
})
  .index("by_watch", ["watchId"])
  .index("by_run", ["runId"])

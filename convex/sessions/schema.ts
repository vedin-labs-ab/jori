import { defineTable } from "convex/server"
import { v } from "convex/values"

const messageSubcursor = v.object({
  createdAt: v.number(),
  messageId: v.id("messages"),
})

const reactionSubcursor = v.object({
  createdAt: v.number(),
  updatedAt: v.number(),
})

export const sessions = defineTable({
  conversationId: v.optional(v.id("conversations")),
  watchId: v.optional(v.string()),
  runId: v.optional(v.id("runs")),
  cursor: v.optional(
    v.object({
      message: v.optional(messageSubcursor),
      reaction: v.optional(reactionSubcursor),
    })
  ),
  updatedAt: v.number(),
})
  .index("by_conversation", ["conversationId"])
  .index("by_run", ["runId"])

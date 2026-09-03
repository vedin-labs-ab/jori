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
  runId: v.optional(v.id("runs")),
  cursor: v.optional(
    v.object({
      message: v.optional(messageSubcursor),
      reaction: v.optional(reactionSubcursor),
    })
  ),
  /** The address replies go to: the run's first message, then the last
   *  drained message that named one, then whatever `send_reply` last used. */
  target: v.optional(v.string()),
  recency: v.optional(
    v.object({
      due: v.array(v.id("persons")),
      done: v.array(v.id("persons")),
      seen: v.array(v.id("conversations")),
      requester: v.optional(v.string()),
    })
  ),
  updatedAt: v.number(),
})
  .index("by_conversation", ["conversationId"])
  .index("by_run", ["runId"])

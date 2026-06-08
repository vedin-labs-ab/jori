import { defineTable } from "convex/server"
import { v } from "convex/values"

export const triggers = defineTable({
  tenantId: v.string(),
  messageId: v.optional(v.id("messages")),
  type: v.union(
    v.literal("manual"),
    v.literal("scheduled"),
    v.literal("message")
  ),
  data: v.optional(v.any()),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_message", ["messageId"])

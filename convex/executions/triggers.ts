import { defineTable } from "convex/server"
import { v } from "convex/values"

export const triggers = defineTable({
  tenantId: v.string(),
  messageId: v.optional(v.id("messages")),
  scheduleId: v.optional(v.id("schedules")),
  type: v.union(
    v.literal("manual"),
    v.literal("scheduled"),
    v.literal("message")
  ),
  data: v.optional(v.any()),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_schedule", ["scheduleId"])

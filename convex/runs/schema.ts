import { defineTable } from "convex/server"
import { v } from "convex/values"

export const runReason = v.union(
  v.object({
    type: v.literal("time"),
    scheduledAt: v.number(),
  }),
  v.object({
    type: v.literal("event"),
    eventId: v.id("events"),
  }),
  v.object({
    type: v.literal("message"),
    messageId: v.id("messages"),
  }),
  v.object({
    type: v.literal("manual"),
    userId: v.optional(v.string()),
  })
)

export const runs = defineTable({
  tenantId: v.string(),
  automationId: v.optional(v.id("automations")),
  reason: runReason,
  data: v.optional(v.any()),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_automation", ["automationId"])

import { defineTable } from "convex/server"
import { v } from "convex/values"

export const scheduleOutput = v.object({
  type: v.literal("slack"),
  channelId: v.string(),
  threadId: v.optional(v.string()),
})

export const scheduleType = v.union(
  v.literal("oneShot"),
  v.literal("recurring")
)

export const scheduleStatus = v.union(
  v.literal("active"),
  v.literal("completed")
)

export const schedules = defineTable({
  tenantId: v.string(),
  name: v.string(),
  description: v.string(),
  metadata: v.optional(v.any()),
  output: scheduleOutput,
  type: scheduleType,
  cron: v.optional(v.string()),
  runAt: v.optional(v.number()),
  nextRunAt: v.optional(v.number()),
  scheduledFunctionId: v.optional(v.id("_scheduled_functions")),
  status: scheduleStatus,
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  lastTriggeredAt: v.optional(v.number()),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_status", ["tenantId", "status"])

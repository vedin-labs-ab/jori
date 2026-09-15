import { defineTable } from "convex/server"
import { v } from "convex/values"

export const workspaceRetention = defineTable({
  organizationId: v.string(),
  state: v.union(
    v.literal("retained"),
    v.literal("deleting"),
    v.literal("deleted")
  ),
  endedAt: v.number(),
  deletesAt: v.number(),
  noticeAt: v.optional(v.number()),
  noticeId: v.optional(v.id("emailSubmissions")),
  noticeRetryAt: v.optional(v.number()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  discoveryErasedAt: v.optional(v.number()),
  blocked: v.optional(v.string()),
  stage: v.optional(v.number()),
  cursor: v.optional(v.string()),
  nextAt: v.optional(v.number()),
})
  .index("by_organizationId", ["organizationId"])
  .index("by_state_and_nextAt", ["state", "nextAt"])

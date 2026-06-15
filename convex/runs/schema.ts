import { defineTable } from "convex/server"
import { v } from "convex/values"
import { sourceMetadataValidator } from "../shared/sources/schema"

const sourceDatum = v.object({
  type: v.string(),
  label: v.string(),
  url: v.optional(v.string()),
})

const runDisplayDetailType = v.union(
  v.literal("channel"),
  v.literal("comment"),
  v.literal("decision"),
  v.literal("issue"),
  v.literal("message"),
  v.literal("next"),
  v.literal("page"),
  v.literal("pull_request"),
  v.literal("repository"),
  v.literal("status"),
  v.literal("stopped"),
  v.literal("tools"),
  v.literal("web_search")
)

export const runDisplayDetail = v.object({
  type: runDisplayDetailType,
  label: v.string(),
  url: v.optional(v.string()),
  at: v.optional(v.number()),
})

export const runDisplay = v.object({
  source: v.object({
    type: v.union(
      v.literal("automation"),
      v.literal("event"),
      v.literal("manual"),
      v.literal("message")
    ),
    event: v.optional(sourceDatum),
    kind: v.optional(sourceDatum),
    metadata: sourceMetadataValidator,
    provider: v.optional(sourceDatum),
  }),
  trigger: v.string(),
  details: v.array(runDisplayDetail),
  taskSource: v.optional(
    v.object({
      label: v.string(),
      url: v.string(),
    })
  ),
})

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
    kind: v.union(v.literal("mention"), v.literal("reply")),
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
  title: v.string(),
  task: v.string(),
  display: runDisplay,
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_automation", ["automationId"])

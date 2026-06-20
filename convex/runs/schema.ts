import { defineTable } from "convex/server"
import { v } from "convex/values"
import { toolSurfaceValidator } from "../shared/integrations"
import { sourceMetadataValidator } from "../shared/sources/schema"

const snapshotDatum = v.object({
  type: v.string(),
  label: v.string(),
  url: v.optional(v.string()),
})

const runSnapshotDetailType = v.union(
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

export const runSnapshotDetail = v.object({
  type: runSnapshotDetailType,
  label: v.string(),
  url: v.optional(v.string()),
  timestamp: v.optional(v.number()),
})

export const runSnapshot = v.object({
  title: v.string(),
  source: v.object({
    type: v.union(
      v.literal("automation"),
      v.literal("event"),
      v.literal("manual"),
      v.literal("message")
    ),
    event: v.optional(snapshotDatum),
    kind: v.optional(snapshotDatum),
    metadata: sourceMetadataValidator,
    surface: v.optional(snapshotDatum),
  }),
  trigger: v.string(),
  details: v.array(runSnapshotDetail),
  taskSource: v.optional(
    v.object({
      label: v.string(),
      url: v.string(),
    })
  ),
})

export const runCause = v.union(
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

export const runStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("stopped")
)

export const toolSnapshot = v.object({
  groups: v.array(
    v.object({
      surface: toolSurfaceValidator,
      label: v.string(),
      tools: v.array(
        v.object({
          access: v.union(v.literal("read"), v.literal("write")),
          description: v.string(),
          label: v.string(),
          requiresApproval: v.optional(v.boolean()),
          tool: v.string(),
        })
      ),
    })
  ),
  webSearch: v.boolean(),
})

export const runs = defineTable({
  tenantId: v.string(),
  automationId: v.optional(v.id("automations")),
  parentId: v.optional(v.id("runs")),
  rootId: v.optional(v.id("runs")),
  cause: runCause,
  instructions: v.optional(v.string()),
  snapshot: runSnapshot,
  status: runStatus,
  workerId: v.optional(v.string()),
  error: v.optional(v.string()),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  endedAt: v.optional(v.number()),
  stoppedBy: v.optional(v.string()),
})
  .index("by_tenant", ["tenantId"])
  .index("by_automation", ["automationId"])
  .index("by_parent", ["parentId"])
  .index("by_root", ["rootId"])

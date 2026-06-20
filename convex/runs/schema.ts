import { defineTable } from "convex/server"
import { v } from "convex/values"
import { toolSurfaceValidator } from "../shared/integrations"
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
    surface: v.optional(sourceDatum),
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
  parentRunId: v.optional(v.id("runs")),
  rootRunId: v.optional(v.id("runs")),
  reason: runReason,
  title: v.string(),
  task: v.string(),
  display: runDisplay,
  status: runStatus,
  promptId: v.optional(v.id("_storage")),
  toolSnapshot: v.optional(toolSnapshot),
  sandboxId: v.optional(v.string()),
  triggerRunId: v.optional(v.string()),
  error: v.optional(v.string()),
  trace: v.optional(
    v.union(
      v.object({
        host: v.string(),
        token: v.string(),
      }),
      v.object({
        fileId: v.id("_storage"),
      })
    )
  ),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  finishedAt: v.optional(v.number()),
  stoppedBy: v.optional(v.string()),
  stoppedAt: v.optional(v.number()),
})
  .index("by_tenant", ["tenantId"])
  .index("by_automation", ["automationId"])
  .index("by_parent", ["parentRunId"])
  .index("by_root", ["rootRunId"])
  .index("by_trigger", ["triggerRunId"])

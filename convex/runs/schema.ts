import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { actorValidator } from "../shared/actor"
import { audienceScopeValidator } from "../shared/audience"
import { toolSurfaceValidator } from "../shared/integrations"

const runSnapshotContextType = v.union(
  v.literal("calendar_event"),
  v.literal("channel"),
  v.literal("comment"),
  v.literal("email"),
  v.literal("file"),
  v.literal("folder"),
  v.literal("issue"),
  v.literal("message"),
  v.literal("next"),
  v.literal("page"),
  v.literal("project"),
  v.literal("pull_request"),
  v.literal("repository"),
  v.literal("schedule"),
  v.literal("sender"),
  v.literal("status"),
  v.literal("subject")
)

const runSnapshotContext = v.object({
  type: runSnapshotContextType,
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
    surface: v.optional(toolSurfaceValidator),
    url: v.optional(v.string()),
  }),
  context: v.array(runSnapshotContext),
})

const runCause = v.union(
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
    personId: v.optional(v.id("persons")),
  })
)

export const runStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("stopped")
)

export function isTerminalRunStatus(status: Infer<typeof runStatus>) {
  return status === "completed" || status === "failed" || status === "stopped"
}

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
  scope: v.optional(audienceScopeValidator),
  conversationId: v.optional(v.id("conversations")),
  cause: runCause,
  instructions: v.optional(v.string()),
  snapshot: runSnapshot,
  status: runStatus,
  workerId: v.optional(v.string()),
  error: v.optional(v.string()),
  createdBy: v.optional(v.id("persons")),
  createdAt: v.number(),
  endedAt: v.optional(v.number()),
  stoppedBy: v.optional(actorValidator),
})
  .index("by_tenant", ["tenantId"])
  .index("by_automation", ["automationId"])
  .index("by_parent", ["parentId"])
  .index("by_root", ["rootId"])
  .index("by_conversation_and_created_at", ["conversationId", "createdAt"])
  .index("by_tenant_and_scope_and_created_at", [
    "tenantId",
    "scope",
    "createdAt",
  ])
  .index("by_tenant_and_created_by_and_created_at", [
    "tenantId",
    "createdBy",
    "createdAt",
  ])

import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { runStatuses } from "../../contracts/runtime/runs"
import { actorValidator } from "../shared/actor"
import { audienceValidator } from "../shared/audience"
import { accessValidator, toolSurfaceValidator } from "../shared/integrations"
import { executionPrincipalValidator } from "./principal"

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

const runSnapshot = v.object({
  title: v.string(),
  source: v.object({
    type: v.union(
      v.literal("job"),
      v.literal("event"),
      v.literal("manual"),
      v.literal("message")
    ),
    surface: v.optional(toolSurfaceValidator),
    url: v.optional(v.string()),
  }),
  context: v.array(runSnapshotContext),
})

export type RunSnapshot = Infer<typeof runSnapshot>

const messageCauseKind = v.union(v.literal("mention"), v.literal("reply"))

export type MessageCauseKind = Infer<typeof messageCauseKind>

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
    kind: messageCauseKind,
  }),
  v.object({
    type: v.literal("manual"),
    personId: v.optional(v.id("persons")),
  })
)

export const runStatus = v.union(
  ...runStatuses.map((status) => v.literal(status))
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
  organizationId: v.string(),
  /** The job this run answers to; absent for interactive work.
   *  `parentId` is the durable job owning a one-shot child, and
   *  `version` the configuration generation the run's access was taken from —
   *  the parent's for owned children, the job's own otherwise. */
  job: v.optional(
    v.object({
      id: v.id("jobs"),
      parentId: v.optional(v.id("jobs")),
      version: v.optional(v.number()),
    })
  ),
  parentId: v.optional(v.id("runs")),
  rootId: v.optional(v.id("runs")),
  audience: audienceValidator,
  conversationId: v.optional(v.id("conversations")),
  cause: runCause,
  principal: executionPrincipalValidator,
  instructions: v.optional(v.string()),
  /**
   * Tool contract for this run. Job and child runs snapshot their
   * access; unbound interactive runs may omit it to use the principal's full
   * tool surface.
   */
  access: v.optional(accessValidator),
  snapshot: runSnapshot,
  status: runStatus,
  workerId: v.optional(v.string()),
  error: v.optional(v.string()),
  /** Outcome returned via finish_run; parents read it from wait_for_agents. */
  result: v.optional(v.string()),
  createdBy: v.optional(v.id("persons")),
  /** The folder whose usage this run's cost answers to, resolved once from
   *  the job's filing when the run is created. Absent for interactive
   *  work, which is filed nowhere and rolls up unfiled. */
  folderId: v.optional(v.id("folders")),
  createdAt: v.number(),
  endedAt: v.optional(v.number()),
  stoppedBy: v.optional(actorValidator),
})
  .index("by_organization", ["organizationId"])
  .index("by_parent", ["parentId"])
  .index("by_root", ["rootId"])
  .index("by_conversation_and_created_at", ["conversationId", "createdAt"])
  .index("by_organization_and_audience_and_created_at", [
    "organizationId",
    "audience",
    "createdAt",
  ])
  .index("by_organization_and_created_by_and_created_at", [
    "organizationId",
    "createdBy",
    "createdAt",
  ])
  .index("by_organization_and_folder_and_created_at", [
    "organizationId",
    "folderId",
    "createdAt",
  ])
  .index("by_organization_and_job_and_created_at", [
    "organizationId",
    "job.id",
    "createdAt",
  ])

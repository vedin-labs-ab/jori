import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { runStatuses } from "../../contracts/runtime/runs"
import { modelSelectionValidator } from "../model/selection"
import { actorValidator } from "../shared/actor"
import { audienceValidator } from "../shared/audience"
import { accessValidator, toolSurfaceValidator } from "../shared/integrations"
import { executionPrincipalValidator } from "./principal"

/** The details a run's snapshot keeps as its context chips. */
export const runSnapshotContextTypes = [
  "calendar_event",
  "channel",
  "comment",
  "email",
  "file",
  "folder",
  "issue",
  "job",
  "message",
  "next",
  "page",
  "project",
  "pull_request",
  "repository",
  "schedule",
  "sender",
  "status",
  "store",
  "subject",
  "table",
] as const

const runSnapshotContextType = v.union(
  ...runSnapshotContextTypes.map((type) => v.literal(type))
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
})

/** The turn's token counts as the console breaks them down. */
const turnTokens = v.object({
  cacheRead: v.number(),
  input: v.number(),
  output: v.number(),
  reasoning: v.number(),
})

/**
 * What the model sees of the transcript once the run has condensed it. The
 * rows stay on disk for Activity and retries; `listTranscript` reads tool
 * rows below `clearedBefore` as stubs and everything below the summary's
 * `before` as the summary. `clearedAtTurn` is the turn the last clearing
 * ran before, so the next decision knows whether the tokens it reads were
 * measured on a cleared prompt.
 */
const runCompaction = v.object({
  clearedAtTurn: v.number(),
  clearedBefore: v.optional(v.number()),
  summary: v.optional(
    v.object({
      before: v.number(),
      content: v.string(),
      turn: v.number(),
    })
  ),
})

export type RunCompaction = Infer<typeof runCompaction>

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
  /** The model and effort the run's turns use, stamped from the console
   *  conversation's choice when the run is created; absent, the run uses
   *  the default selection, as every job and provider run does. */
  model: v.optional(modelSelectionValidator),
  status: runStatus,
  /** The durable workflow running this run, cleared when it completes. */
  workflowId: v.optional(v.string()),
  error: v.optional(v.string()),
  /** Outcome returned via finish_run; parents read it from wait_for_agents. */
  result: v.optional(v.string()),
  createdBy: v.optional(v.id("persons")),
  /** The folder whose usage this run costs. Chat filing moves its history;
   *  job runs keep the folder stamped when they started. */
  folderId: v.optional(v.id("folders")),
  /** Prompt tokens of the run's latest model turn, cached inclusive: how
   *  much of the model's window the run is using. The trace layer writes
   *  it once per turn, so the loop's compaction decision and the console's
   *  indicator read it without walking traces. `turnTokens` is the same
   *  turn's breakdown, for the indicator's popover. */
  promptTokens: v.optional(v.number()),
  turnTokens: v.optional(turnTokens),
  compaction: v.optional(runCompaction),
  createdAt: v.number(),
  endedAt: v.optional(v.number()),
  stoppedBy: v.optional(actorValidator),
})
  .index("by_organization", ["organizationId"])
  .index("by_organizationId_and_status", ["organizationId", "status"])
  .index("by_organizationId_and_workflowId", ["organizationId", "workflowId"])
  .index("by_parent", ["parentId"])
  .index("by_root", ["rootId"])
  .index("by_conversation_and_folder", ["conversationId", "folderId"])
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

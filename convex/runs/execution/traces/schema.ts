import { defineTable } from "convex/server"
import { v } from "convex/values"
import { toolSnapshot } from "../../schema"

const base = {
  organizationId: v.string(),
  runId: v.id("runs"),
  key: v.string(),
  timestamp: v.number(),
}
const timeline = { ...base, sequence: v.number() }
const call = { ...timeline, callId: v.string() }

const tool = v.object({
  name: v.string(),
  route: v.union(
    v.literal("agent"),
    v.literal("surface"),
    v.literal("convex"),
    v.literal("run"),
    v.literal("sandbox")
  ),
  access: v.union(v.literal("read"), v.literal("write")),
})
const result = v.union(
  v.object({
    kind: v.literal("string"),
    preview: v.string(),
    length: v.number(),
  }),
  v.object({ kind: v.literal("number"), preview: v.string() }),
  v.object({ kind: v.literal("boolean") }),
  v.object({ kind: v.literal("null") }),
  v.object({ kind: v.literal("array"), size: v.number() }),
  v.object({
    kind: v.literal("object"),
    size: v.number(),
    itemKey: v.optional(v.string()),
    itemCount: v.optional(v.number()),
    hasMore: v.optional(v.boolean()),
  })
)
const usage = v.object({
  durationMs: v.number(),
  // `input` and `output` are the pair the rate table prices and the ledger
  // stores; the rest break the input side down.
  tokens: v.object({
    cacheRead: v.number(),
    cacheWrite: v.number(),
    input: v.number(),
    output: v.number(),
    reasoning: v.number(),
    total: v.number(),
    uncached: v.number(),
  }),
  toolCalls: v.number(),
})
const provider = v.union(
  v.object({ name: v.string(), request: v.string() }),
  v.null()
)
const text = v.union(v.string(), v.null())

// Each trace's `data` shape is defined once here and shared by both its row
// variant (below) and the `traceData` union the record mutation validates
// against, so the two cannot drift.
const preparedData = v.object({ tools: toolSnapshot })
const offerData = v.object({ offer: v.id("integrationOffers") })
const approvalData = v.object({ approval: v.id("approvals") })
const fileData = v.object({ file: v.id("files") })
const agentData = v.object({ child: v.id("runs") })
const waiterData = v.object({ waiter: v.id("waiters") })
const errorData = v.object({ error: v.string() })
// The model the turn actually ran on, named at the call site rather than
// inferred later: what a run cost is priced from the model that answered it.
const modelData = v.object({
  model: v.string(),
  usage,
  output: text,
  reasoning: text,
})
const toolStartedData = v.object({ tool, input: v.any() })
const toolCompletedData = v.object({ tool, result, provider })
const toolFailedData = v.object({ tool, input: v.any(), error: v.string() })
const toolWaitingData = v.object({ tool })
// What a compaction replaced for the model: rows in [fromOrder, toOrder)
// read as stubs or as the summary from here on, after a prompt that had
// grown to `tokensBefore`.
const compactionData = v.object({
  kind: v.union(v.literal("cleared"), v.literal("summarized")),
  fromOrder: v.number(),
  toOrder: v.number(),
  tokensBefore: v.number(),
})

const runPrepared = v.object({
  ...base,
  type: v.literal("run.prepared"),
  data: preparedData,
})
const runStopped = v.object({ ...base, type: v.literal("run.stopped") })

const offerRequested = v.object({
  ...timeline,
  type: v.literal("offer.requested"),
  data: offerData,
})
const offerResolved = v.object({
  ...timeline,
  type: v.literal("offer.resolved"),
  data: offerData,
})
const approvalRequested = v.object({
  ...timeline,
  type: v.literal("approval.requested"),
  data: approvalData,
})
const approvalResolved = v.object({
  ...timeline,
  type: v.literal("approval.resolved"),
  data: approvalData,
})
const fileSaved = v.object({
  ...timeline,
  type: v.literal("file.saved"),
  data: fileData,
})
const agentStarted = v.object({
  ...timeline,
  type: v.literal("agent.started"),
  data: agentData,
})
const runWaiting = v.object({
  ...timeline,
  type: v.literal("run.waiting"),
  data: waiterData,
})
const runResumed = v.object({
  ...timeline,
  type: v.literal("run.resumed"),
  data: waiterData,
})

const runStarted = v.object({ ...timeline, type: v.literal("run.started") })
const runCompleted = v.object({
  ...timeline,
  type: v.literal("run.completed"),
})
const runFailed = v.object({
  ...timeline,
  type: v.literal("run.failed"),
  data: errorData,
})

const modelStarted = v.object({ ...timeline, type: v.literal("model.started") })
const modelCompleted = v.object({
  ...timeline,
  type: v.literal("model.completed"),
  data: modelData,
})
const modelFailed = v.object({
  ...timeline,
  type: v.literal("model.failed"),
  data: errorData,
})

const toolStarted = v.object({
  ...call,
  type: v.literal("tool.started"),
  data: toolStartedData,
})
const toolCompleted = v.object({
  ...call,
  type: v.literal("tool.completed"),
  data: toolCompletedData,
})
const toolFailed = v.object({
  ...call,
  type: v.literal("tool.failed"),
  data: toolFailedData,
})
const toolWaiting = v.object({
  ...call,
  type: v.literal("tool.waiting"),
  data: toolWaitingData,
})
const transcriptCompacted = v.object({
  ...timeline,
  type: v.literal("transcript.compacted"),
  data: compactionData,
})

export const traceType = v.union(
  v.literal("run.prepared"),
  v.literal("run.stopped"),
  v.literal("run.started"),
  v.literal("run.completed"),
  v.literal("run.failed"),
  v.literal("run.waiting"),
  v.literal("run.resumed"),
  v.literal("model.started"),
  v.literal("model.completed"),
  v.literal("model.failed"),
  v.literal("tool.started"),
  v.literal("tool.completed"),
  v.literal("tool.failed"),
  v.literal("tool.waiting"),
  v.literal("offer.requested"),
  v.literal("offer.resolved"),
  v.literal("approval.requested"),
  v.literal("approval.resolved"),
  v.literal("file.saved"),
  v.literal("agent.started"),
  v.literal("transcript.compacted")
)

export const traceData = v.union(
  preparedData,
  offerData,
  approvalData,
  fileData,
  agentData,
  waiterData,
  errorData,
  modelData,
  toolStartedData,
  toolCompletedData,
  toolFailedData,
  toolWaitingData,
  compactionData
)

export const traces = defineTable(
  v.union(
    runPrepared,
    runStopped,
    runStarted,
    runCompleted,
    runFailed,
    runWaiting,
    runResumed,
    modelStarted,
    modelCompleted,
    modelFailed,
    toolStarted,
    toolCompleted,
    toolFailed,
    toolWaiting,
    offerRequested,
    offerResolved,
    approvalRequested,
    approvalResolved,
    fileSaved,
    agentStarted,
    transcriptCompacted
  )
)
  .index("by_run_and_timestamp", ["runId", "timestamp"])
  .index("by_key", ["key"])

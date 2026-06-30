import { defineTable } from "convex/server"
import { v } from "convex/values"
import { toolSnapshot } from "../../runs/schema"

const base = {
  tenantId: v.string(),
  runId: v.id("runs"),
  key: v.string(),
  timestamp: v.number(),
}
const timeline = { ...base, sequence: v.number() }
const worker = { ...timeline, attempt: v.number() }
const call = { ...worker, callId: v.string() }

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
  v.object({ kind: v.literal("object"), size: v.number() })
)
const usage = v.object({
  durationMs: v.number(),
  inputTokens: v.number(),
  inputCacheReadTokens: v.number(),
  inputCacheWriteTokens: v.number(),
  inputUncachedTokens: v.number(),
  outputTokens: v.number(),
  reasoningTokens: v.number(),
  totalTokens: v.number(),
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
const assetData = v.object({ asset: v.id("assets") })
const agentData = v.object({ child: v.id("runs") })
const waiterData = v.object({ waiter: v.id("waiters") })
const errorData = v.object({ error: v.string() })
const modelData = v.object({ usage, output: text, reasoning: text })
const toolStartedData = v.object({ tool, input: v.any() })
const toolCompletedData = v.object({ tool, result, provider })
const toolFailedData = v.object({ tool, input: v.any(), error: v.string() })
const toolWaitingData = v.object({ tool })

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
const assetSaved = v.object({
  ...timeline,
  type: v.literal("asset.saved"),
  data: assetData,
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

const runStarted = v.object({ ...worker, type: v.literal("run.started") })
const runCompleted = v.object({ ...worker, type: v.literal("run.completed") })
const runFailed = v.object({
  ...worker,
  type: v.literal("run.failed"),
  data: errorData,
})

const modelStarted = v.object({ ...worker, type: v.literal("model.started") })
const modelCompleted = v.object({
  ...worker,
  type: v.literal("model.completed"),
  data: modelData,
})
const modelFailed = v.object({
  ...worker,
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
  v.literal("asset.saved"),
  v.literal("agent.started")
)

export const traceData = v.union(
  preparedData,
  offerData,
  approvalData,
  assetData,
  agentData,
  waiterData,
  errorData,
  modelData,
  toolStartedData,
  toolCompletedData,
  toolFailedData,
  toolWaitingData
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
    assetSaved,
    agentStarted
  )
)
  .index("by_run_and_timestamp", ["runId", "timestamp"])
  .index("by_key", ["key"])

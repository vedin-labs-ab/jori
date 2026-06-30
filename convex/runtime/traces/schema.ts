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

const runPrepared = v.object({
  ...base,
  type: v.literal("run.prepared"),
  data: v.object({ tools: toolSnapshot }),
})
const runStopped = v.object({ ...base, type: v.literal("run.stopped") })

const offerRequested = v.object({
  ...timeline,
  type: v.literal("offer.requested"),
  data: v.object({ offer: v.id("integrationOffers") }),
})
const offerResolved = v.object({
  ...timeline,
  type: v.literal("offer.resolved"),
  data: v.object({ offer: v.id("integrationOffers") }),
})
const approvalRequested = v.object({
  ...timeline,
  type: v.literal("approval.requested"),
  data: v.object({ approval: v.id("approvals") }),
})
const approvalResolved = v.object({
  ...timeline,
  type: v.literal("approval.resolved"),
  data: v.object({ approval: v.id("approvals") }),
})
const assetSaved = v.object({
  ...timeline,
  type: v.literal("asset.saved"),
  data: v.object({ asset: v.id("assets") }),
})
const agentStarted = v.object({
  ...timeline,
  type: v.literal("agent.started"),
  data: v.object({ child: v.id("runs") }),
})
const runWaiting = v.object({
  ...timeline,
  type: v.literal("run.waiting"),
  data: v.object({ waiter: v.id("waiters") }),
})
const runResumed = v.object({
  ...timeline,
  type: v.literal("run.resumed"),
  data: v.object({ waiter: v.id("waiters") }),
})

const runStarted = v.object({ ...worker, type: v.literal("run.started") })
const runCompleted = v.object({ ...worker, type: v.literal("run.completed") })
const runFailed = v.object({
  ...worker,
  type: v.literal("run.failed"),
  data: v.object({ error: v.string() }),
})

const modelStarted = v.object({ ...worker, type: v.literal("model.started") })
const modelCompleted = v.object({
  ...worker,
  type: v.literal("model.completed"),
  data: v.object({ usage, output: text, reasoning: text }),
})
const modelFailed = v.object({
  ...worker,
  type: v.literal("model.failed"),
  data: v.object({ error: v.string() }),
})

const toolStarted = v.object({
  ...call,
  type: v.literal("tool.started"),
  data: v.object({ tool, input: v.any() }),
})
const toolCompleted = v.object({
  ...call,
  type: v.literal("tool.completed"),
  data: v.object({ tool, result, provider }),
})
const toolFailed = v.object({
  ...call,
  type: v.literal("tool.failed"),
  data: v.object({ tool, input: v.any(), error: v.string() }),
})
const toolWaiting = v.object({
  ...call,
  type: v.literal("tool.waiting"),
  data: v.object({ tool }),
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
  v.object({ tools: toolSnapshot }),
  v.object({ offer: v.id("integrationOffers") }),
  v.object({ approval: v.id("approvals") }),
  v.object({ asset: v.id("assets") }),
  v.object({ child: v.id("runs") }),
  v.object({ waiter: v.id("waiters") }),
  v.object({ error: v.string() }),
  v.object({ usage, output: text, reasoning: text }),
  v.object({ tool, input: v.any() }),
  v.object({ tool, result, provider }),
  v.object({ tool, input: v.any(), error: v.string() }),
  v.object({ tool })
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

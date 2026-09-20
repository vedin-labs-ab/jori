import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
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

// The row variants also supply the record mutation's event names.
const variants = [
  v.object({
    ...base,
    type: v.literal("run.prepared"),
    data: preparedData,
  }),
  v.object({ ...base, type: v.literal("run.stopped") }),
  v.object({ ...timeline, type: v.literal("run.started") }),
  v.object({
    ...timeline,
    type: v.literal("run.completed"),
  }),
  v.object({
    ...timeline,
    type: v.literal("run.failed"),
    data: errorData,
  }),
  v.object({
    ...timeline,
    type: v.literal("run.waiting"),
    data: waiterData,
  }),
  v.object({
    ...timeline,
    type: v.literal("run.resumed"),
    data: waiterData,
  }),
  v.object({ ...timeline, type: v.literal("model.started") }),
  v.object({
    ...timeline,
    type: v.literal("model.completed"),
    data: modelData,
  }),
  v.object({
    ...timeline,
    type: v.literal("model.failed"),
    data: errorData,
  }),
  v.object({
    ...call,
    type: v.literal("tool.started"),
    data: toolStartedData,
  }),
  v.object({
    ...call,
    type: v.literal("tool.completed"),
    data: toolCompletedData,
  }),
  v.object({
    ...call,
    type: v.literal("tool.failed"),
    data: toolFailedData,
  }),
  v.object({
    ...call,
    type: v.literal("tool.waiting"),
    data: toolWaitingData,
  }),
  v.object({
    ...timeline,
    type: v.literal("offer.requested"),
    data: offerData,
  }),
  v.object({
    ...timeline,
    type: v.literal("offer.resolved"),
    data: offerData,
  }),
  v.object({
    ...timeline,
    type: v.literal("approval.requested"),
    data: approvalData,
  }),
  v.object({
    ...timeline,
    type: v.literal("approval.resolved"),
    data: approvalData,
  }),
  v.object({
    ...timeline,
    type: v.literal("file.saved"),
    data: fileData,
  }),
  v.object({
    ...timeline,
    type: v.literal("agent.started"),
    data: agentData,
  }),
  v.object({
    ...timeline,
    type: v.literal("transcript.compacted"),
    data: compactionData,
  }),
] as const

export const traceType = v.union(
  ...variants.map((variant) => variant.fields.type)
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

// The runtime records every type but the prepared trace, which the run's own
// mutation writes.
export type RuntimeTraceType = Exclude<Infer<typeof traceType>, "run.prepared">
export type TraceData = Infer<typeof traceData>
export type TraceTool = Infer<typeof tool>
export type TraceProvider = Infer<typeof provider>
export type ToolResult = Infer<typeof result>
export type ModelUsage = Infer<typeof usage>
export type ModelTokens = ModelUsage["tokens"]

export const traces = defineTable(v.union(...variants))
  .index("by_run_and_timestamp", ["runId", "timestamp"])
  .index("by_key", ["key"])

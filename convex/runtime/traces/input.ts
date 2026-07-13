import { v } from "convex/values"
import { traceData, traceType } from "../../runs/execution/traces/schema"

export const workerTraceArgs = {
  attempt: v.optional(v.number()),
  callId: v.optional(v.string()),
  data: v.optional(traceData),
  key: v.string(),
  runId: v.id("runs"),
  secret: v.string(),
  sequence: v.optional(v.number()),
  type: traceType,
}

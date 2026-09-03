import { type Infer } from "convex/values"
import { type Doc } from "../../../_generated/dataModel"
import { type MutationCtx } from "../../../_generated/server"
import { type traceData } from "./schema"

type TraceData = Infer<typeof traceData>
type TraceInsert = WithoutSystemFields<Doc<"traces">>
type WithoutSystemFields<Row> = Row extends unknown
  ? Omit<Row, "_creationTime" | "_id">
  : never

// The one write path into the traces table: an insert keyed for idempotency,
// with nothing that reacts to the trace. Reactions (status flips, wakes,
// metering) live in data.ts, which the run tree also depends on, so keeping
// the bare write here lets the tree record its stop trace without a cycle.
export async function recordTrace(
  ctx: MutationCtx,
  args: {
    callId?: string
    data?: TraceData
    key: string
    run: Doc<"runs">
    sequence?: number
    timestamp?: number
    type: Doc<"traces">["type"]
  }
) {
  const existing = await ctx.db
    .query("traces")
    .withIndex("by_key", (query) => query.eq("key", args.key))
    .first()

  if (existing !== null) {
    return false
  }

  await ctx.db.insert("traces", traceInsert(args))

  return true
}

function traceInsert(args: {
  callId?: string
  data?: TraceData
  key: string
  run: Doc<"runs">
  sequence?: number
  timestamp?: number
  type: Doc<"traces">["type"]
}): TraceInsert {
  return {
    organizationId: args.run.organizationId,
    runId: args.run._id,
    key: args.key,
    type: args.type,
    ...(args.sequence === undefined ? {} : { sequence: args.sequence }),
    ...(args.callId === undefined ? {} : { callId: args.callId }),
    ...(args.data === undefined ? {} : { data: args.data }),
    timestamp: args.timestamp ?? Date.now(),
  } as TraceInsert
}

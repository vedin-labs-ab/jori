import { v } from "convex/values"
import { internalMutation } from "../../../_generated/server"
import { recordWorkerTrace } from "./data"
import { traceData, traceType } from "./schema"

export const record = internalMutation({
  args: {
    callId: v.optional(v.string()),
    data: v.optional(traceData),
    key: v.string(),
    runId: v.id("runs"),
    sequence: v.optional(v.number()),
    type: traceType,
  },
  returns: v.object({
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    return await recordWorkerTrace(ctx, args)
  },
})

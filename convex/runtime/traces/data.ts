import { v } from "convex/values"
import { mutation } from "../../_generated/server"
import { recordWorkerTrace } from "../../runs/execution/traces/data"
import { requireWorkerSecret } from "../secret"
import { workerTraceArgs } from "./input"

export const record = mutation({
  args: workerTraceArgs,
  returns: v.object({
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    return await recordWorkerTrace(ctx, args)
  },
})

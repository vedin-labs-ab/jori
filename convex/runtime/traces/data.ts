import { v } from "convex/values"
import { type RuntimeEventRecord } from "../../../contracts/runtime/worker"
import { mutation } from "../../_generated/server"
import { recordWorkerTrace } from "../../runs/execution/traces/data"
import { stopRunChildren } from "../../runs/tree"
import { requireWorkerSecret } from "../secret"
import { workerTraceArgs } from "./input"

export const record = mutation({
  args: workerTraceArgs,
  returns: v.object({
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const recorded = await recordWorkerTrace(
      ctx,
      args satisfies RuntimeEventRecord
    )

    // A terminal run takes its delegated subtree with it: children exist for
    // their parent, so nothing keeps running for a consumer that is gone.
    if (
      recorded.created &&
      (args.type === "run.completed" || args.type === "run.failed")
    ) {
      await stopRunChildren(ctx, args.runId)
    }

    return recorded
  },
})

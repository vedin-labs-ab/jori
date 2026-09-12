import { v } from "convex/values"
import { internalMutation, internalQuery } from "../_generated/server"
import { readRunInput } from "./agent/input/read"
import { isRunExecutable } from "./execution/guard"

export const getInputByRun = internalQuery({
  args: { runId: v.id("runs") },
  handler: async (ctx, args) => await readRunInput(ctx, args.runId),
})

export const get = internalQuery({
  args: {
    runId: v.id("runs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.runId)
  },
})

/** The outcome a run reported through `finish_run`; its parent reads it back
 *  from `wait_for_agents`. The tool layer caps the text before it gets here. */
export const finish = internalMutation({
  args: {
    runId: v.id("runs"),
    result: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)

    if (run === null || !(await isRunExecutable(ctx, run))) {
      return null
    }

    await ctx.db.patch(args.runId, { result: args.result })

    return null
  },
})

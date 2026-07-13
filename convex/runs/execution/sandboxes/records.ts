import { v } from "convex/values"
import { internalMutation, internalQuery } from "../../../_generated/server"
import { claimReusableSandbox, findRetainedSandbox } from "./data"

export const claimForRun = internalMutation({
  args: {
    runId: v.id("runs"),
  },
  returns: v.union(v.object({ externalId: v.string() }), v.null()),
  handler: async (ctx, args) => {
    return await claimReusableSandbox(ctx, args.runId)
  },
})

export const retainedByRun = internalQuery({
  args: {
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await findRetainedSandbox(ctx, args.runId)
  },
})

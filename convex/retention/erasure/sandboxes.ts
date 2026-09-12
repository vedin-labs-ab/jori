"use node"

import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { internalAction } from "../../_generated/server"
import { killSandbox } from "../../runtime/sandbox/blaxel/client"

export const clean = internalAction({
  args: { id: v.id("workspaceRetention") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const targets: Doc<"sandboxes">[] = await ctx.runQuery(
      internal.retention.records.sandboxes,
      args
    )
    for (const target of targets) {
      try {
        await killSandbox(target.externalId)
        await ctx.runMutation(internal.retention.deletion.sandboxRemoved, {
          id: args.id,
          sandboxId: target._id,
        })
      } catch {
        await ctx.runMutation(internal.retention.deletion.blocked, {
          id: args.id,
          message: "Sandbox removal failed; deletion will retry.",
        })
        return null
      }
    }
    await ctx.runMutation(internal.retention.deletion.step, args)
    return null
  },
})

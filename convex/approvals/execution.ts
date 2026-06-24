import { v } from "convex/values"
import { internalMutation } from "../_generated/server"

const executionLeaseMs = 5 * 60 * 1000

export const claim = internalMutation({
  args: {
    approvalId: v.id("approvals"),
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<unknown> => {
    const approval = await ctx.db.get(args.approvalId)

    if (
      approval === null ||
      approval.runId !== args.runId ||
      approval.status !== "approved"
    ) {
      return { state: "invalid" as const }
    }

    if (approval.result !== undefined) {
      return { state: "done" as const, result: approval.result }
    }

    if (
      approval.claimedAt !== undefined &&
      Date.now() - approval.claimedAt < executionLeaseMs
    ) {
      return { state: "executing" as const }
    }

    await ctx.db.patch(approval._id, { claimedAt: Date.now() })

    return {
      state: "claim" as const,
      surface: approval.surface,
      tool: approval.tool,
      inputJson: approval.args,
    }
  },
})

export const record = internalMutation({
  args: {
    approvalId: v.id("approvals"),
    result: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (approval !== null) {
      await ctx.db.patch(approval._id, {
        result: args.result,
        consumedAt: Date.now(),
      })
    }

    return null
  },
})

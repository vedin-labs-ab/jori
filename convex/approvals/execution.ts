import { v } from "convex/values"
import { encodeToolResult } from "../../contracts/json"
import { approvalExecutionTimeoutMs } from "../../contracts/runtime/handoffs"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { wakeRun } from "../runs/execution/waiters/data"

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

    if (approval.claimedAt !== undefined) {
      const expiresAt = approval.claimedAt + approvalExecutionTimeoutMs

      if (Date.now() < expiresAt) {
        return { state: "executing" as const, expiresAt }
      }

      const result = encodeToolResult({
        status: "error",
        error: {
          message:
            "The approved action's outcome could not be confirmed. It may have taken effect. Do not retry it; verify the provider's state first.",
        },
      })

      await storeResult(ctx, approval, result)

      return { state: "done" as const, result }
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
    runId: v.id("runs"),
    result: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (
      approval === null ||
      approval.runId !== args.runId ||
      approval.status !== "approved" ||
      approval.claimedAt === undefined
    ) {
      throw new Error("Approval execution is not claimed by this run.")
    }

    if (approval.result !== undefined) {
      return approval.result
    }

    await storeResult(ctx, approval, args.result)

    return args.result
  },
})

async function storeResult(
  ctx: MutationCtx,
  approval: Doc<"approvals">,
  result: string
) {
  await ctx.db.patch(approval._id, { result })
  await wakeRun(ctx, {
    runId: approval.runId,
    reason: "resolved",
    subject: { kind: "approval", id: approval._id },
  })
}

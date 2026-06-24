import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { requiredString } from "../shared/input"

const cancelApprovalTool = "cancel_approval_request"

export function isCancelApprovalTool(tool: string) {
  return tool === cancelApprovalTool
}

export async function cancelApprovalRequest(
  ctx: ActionCtx,
  run: { _id: Id<"runs">; tenantId: string },
  args: unknown
) {
  const input = parseCancelInput(args)
  const result = await ctx.runMutation(internal.approvals.approvals.cancel, {
    approvalId: input.approvalId,
    runId: run._id,
    tenantId: run.tenantId,
    reason: input.reason,
  })

  return cancelResult(result.status)
}

function parseCancelInput(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new Error(
      "cancel_approval_request requires an approvalId and reason."
    )
  }

  const record = args as { approvalId?: unknown; reason?: unknown }

  return {
    approvalId: requiredString(
      record.approvalId,
      "approvalId"
    ) as Id<"approvals">,
    reason: requiredString(record.reason, "reason"),
  }
}

function cancelResult(status: "cancelled" | "missing" | "decided" | "expired") {
  if (status === "cancelled") {
    return {
      status: "cancelled" as const,
      message: "Cancelled the pending approval request.",
    }
  }

  if (status === "missing") {
    return {
      status: "missing" as const,
      message: "No matching pending approval request was found for this run.",
    }
  }

  return {
    status: "already_resolved" as const,
    message: "That approval request was already resolved.",
  }
}

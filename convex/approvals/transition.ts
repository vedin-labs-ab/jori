import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { wakeRun } from "../runs/execution/waiters/data"
import { type Actor } from "../shared/actor"
import { type ApprovalTransitionType, recordTransition } from "../transitions"

type ApprovalPatch = Partial<Omit<Doc<"approvals">, "_creationTime" | "_id">>
type ApprovalDelivery = NonNullable<Doc<"approvals">["delivery"]>
type ApprovalDeliveryFailure = NonNullable<Doc<"approvals">["deliveryFailure"]>

export async function recordApprovalCreated(
  ctx: MutationCtx,
  approval: Doc<"approvals">
) {
  await recordTransition(ctx, {
    tenantId: approval.tenantId,
    subject: { kind: "approval", id: approval._id },
    type: "created",
  })
}

export async function recordApprovalDelivery(
  ctx: MutationCtx,
  approval: Doc<"approvals">,
  delivery: ApprovalDelivery
) {
  const updated = await patchAndRead(ctx, approval._id, { delivery })

  if (updated !== null) {
    await recordTransition(ctx, {
      tenantId: updated.tenantId,
      subject: { kind: "approval", id: updated._id },
      syncSurface: isTerminalApprovalStatus(updated.status),
      type: "delivered",
    })
  }

  return updated
}

export async function markApprovalDecided(
  ctx: MutationCtx,
  approval: Doc<"approvals">,
  args: {
    decidedBy: Actor
    decision: "approved" | "denied"
    now: number
  }
) {
  return await settleApproval(ctx, approval, {
    cancelFunction: true,
    patch: {
      status: args.decision,
      decidedBy: args.decidedBy,
      decidedAt: args.now,
    },
    syncSurface: true,
    type: args.decision,
  })
}

export async function markApprovalCancelled(
  ctx: MutationCtx,
  approval: Doc<"approvals">,
  args: {
    cancelledBy: Actor | undefined
    now: number
    reason: string
  }
) {
  return await settleApproval(ctx, approval, {
    cancelFunction: true,
    patch: {
      status: "cancelled",
      cancelReason: args.reason,
      cancelledBy: args.cancelledBy,
      cancelledAt: args.now,
    },
    syncSurface: true,
    type: "cancelled",
  })
}

export async function markApprovalExpired(
  ctx: MutationCtx,
  approval: Doc<"approvals">
) {
  return await settleApproval(ctx, approval, {
    cancelFunction: false,
    patch: { status: "expired" },
    syncSurface: true,
    type: "expired",
  })
}

export async function markApprovalFailed(
  ctx: MutationCtx,
  approval: Doc<"approvals">,
  failure: ApprovalDeliveryFailure
) {
  return await settleApproval(ctx, approval, {
    cancelFunction: true,
    patch: { deliveryFailure: failure, status: "failed" },
    type: "failed",
  })
}

// Settling always clears functionId: the pending expiry timer is either
// cancelled here or has already fired.
async function settleApproval(
  ctx: MutationCtx,
  approval: Doc<"approvals">,
  args: {
    cancelFunction: boolean
    patch: ApprovalPatch
    syncSurface?: boolean
    type: ApprovalTransitionType
  }
) {
  if (approval.status !== "pending") {
    return approval
  }

  if (args.cancelFunction) {
    await cancelApprovalFunction(ctx, approval)
  }

  const updated = await patchAndRead(ctx, approval._id, {
    ...args.patch,
    functionId: undefined,
  })

  if (updated !== null) {
    await recordTransition(ctx, {
      tenantId: updated.tenantId,
      subject: { kind: "approval", id: updated._id },
      syncSurface: args.syncSurface,
      type: args.type,
    })
    await wakeApprovalRun(ctx, updated)
  }

  return updated
}

export async function patchAndRead(
  ctx: MutationCtx,
  approvalId: Doc<"approvals">["_id"],
  patch: ApprovalPatch
) {
  await ctx.db.patch(approvalId, patch)

  return await ctx.db.get(approvalId)
}

async function cancelApprovalFunction(
  ctx: MutationCtx,
  approval: Doc<"approvals">
) {
  if (approval.functionId === undefined) {
    return
  }

  await ctx.scheduler.cancel(approval.functionId)
}

async function wakeApprovalRun(ctx: MutationCtx, approval: Doc<"approvals">) {
  await wakeRun(ctx, {
    runId: approval.runId,
    reason: "resolved",
    subject: { kind: "approval", id: approval._id },
  })
}

export function isTerminalApprovalStatus(status: Doc<"approvals">["status"]) {
  return (
    status === "approved" ||
    status === "cancelled" ||
    status === "denied" ||
    status === "expired" ||
    status === "failed"
  )
}

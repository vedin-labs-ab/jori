import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { wakeRun } from "../runtime/waiters/data"
import { type Actor } from "../shared/actor"
import { recordTransition } from "../transitions"

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
      syncSurface: hasTerminalSurfaceState(updated),
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
  if (approval.status !== "pending") {
    return approval
  }

  await cancelApprovalFunction(ctx, approval)
  const updated = await patchAndRead(ctx, approval._id, {
    status: args.decision,
    decidedBy: args.decidedBy,
    decidedAt: args.now,
    functionId: undefined,
  })

  if (updated !== null) {
    await recordTransition(ctx, {
      tenantId: updated.tenantId,
      subject: { kind: "approval", id: updated._id },
      syncSurface: true,
      type: args.decision,
    })
    await wakeApprovalRun(ctx, updated)
  }

  return updated
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
  if (approval.status !== "pending") {
    return approval
  }

  await cancelApprovalFunction(ctx, approval)
  const updated = await patchAndRead(ctx, approval._id, {
    status: "cancelled",
    cancelReason: args.reason,
    cancelledBy: args.cancelledBy,
    cancelledAt: args.now,
    functionId: undefined,
  })

  if (updated !== null) {
    await recordTransition(ctx, {
      tenantId: updated.tenantId,
      subject: { kind: "approval", id: updated._id },
      syncSurface: true,
      type: "cancelled",
    })
    await wakeApprovalRun(ctx, updated)
  }

  return updated
}

export async function markApprovalExpired(
  ctx: MutationCtx,
  approval: Doc<"approvals">
) {
  if (approval.status !== "pending") {
    return approval
  }

  const updated = await patchAndRead(ctx, approval._id, {
    status: "expired",
    functionId: undefined,
  })

  if (updated !== null) {
    await recordTransition(ctx, {
      tenantId: updated.tenantId,
      subject: { kind: "approval", id: updated._id },
      syncSurface: true,
      type: "expired",
    })
    await wakeApprovalRun(ctx, updated)
  }

  return updated
}

export async function markApprovalFailed(
  ctx: MutationCtx,
  approval: Doc<"approvals">,
  failure: ApprovalDeliveryFailure
) {
  if (approval.status !== "pending") {
    return approval
  }

  await cancelApprovalFunction(ctx, approval)
  const updated = await patchAndRead(ctx, approval._id, {
    deliveryFailure: failure,
    functionId: undefined,
    status: "failed",
  })

  if (updated !== null) {
    await recordTransition(ctx, {
      tenantId: updated.tenantId,
      subject: { kind: "approval", id: updated._id },
      type: "failed",
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

function hasTerminalSurfaceState(approval: Doc<"approvals">) {
  return (
    approval.status === "approved" ||
    approval.status === "cancelled" ||
    approval.status === "denied" ||
    approval.status === "expired" ||
    approval.status === "failed"
  )
}

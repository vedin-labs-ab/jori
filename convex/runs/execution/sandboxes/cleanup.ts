import { internal } from "../../../_generated/api"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { type MutationCtx } from "../../../_generated/server"
import { findSandboxByExternalId } from "./data"

const cleanupLeaseMs = 2 * 60 * 1000

type CleanupTarget = {
  externalId: string
  runId: Id<"runs">
  expiresAt?: number
}

export async function reserveSandboxCleanup(
  ctx: MutationCtx,
  args: CleanupTarget
) {
  const existing = await findSandboxByExternalId(ctx, args.externalId)
  if (!canReserve(existing, args)) {
    return false
  }

  const expiresAt = Date.now() + cleanupLeaseMs
  await ctx.db.patch(existing._id, {
    expiresAt,
    status: "cleaning",
    updatedAt: Date.now(),
  })
  // Actions are not automatically retried. This watchdog is committed with
  // the lease and recovers both reported failures and interrupted actions.
  await ctx.scheduler.runAt(expiresAt, internal.runtime.sandbox.e2b.kill, {
    externalId: args.externalId,
    runId: args.runId,
  })
  return true
}

function canReserve(
  sandbox: Doc<"sandboxes"> | null,
  args: CleanupTarget
): sandbox is Doc<"sandboxes"> {
  if (
    sandbox === null ||
    sandbox.runId !== args.runId ||
    sandbox.status === "cleaned"
  ) {
    return false
  }
  if (args.expiresAt !== undefined) {
    return (
      sandbox.status === "idle" &&
      sandbox.expiresAt === args.expiresAt &&
      args.expiresAt <= Date.now()
    )
  }
  if (sandbox.status === "idle") {
    return false
  }
  return sandbox.status === "active" || (sandbox.expiresAt ?? 0) <= Date.now()
}

export async function markSandboxCleaned(
  ctx: MutationCtx,
  args: { error?: string; externalId: string }
) {
  const existing = await findSandboxByExternalId(ctx, args.externalId)
  if (existing?.status === "cleaning") {
    await ctx.db.patch(existing._id, {
      error: args.error,
      expiresAt: args.error === undefined ? undefined : existing.expiresAt,
      status: args.error === undefined ? "cleaned" : "failed",
      updatedAt: Date.now(),
    })
  }
  return null
}

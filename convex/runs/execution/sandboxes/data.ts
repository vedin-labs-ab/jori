import { isTerminalRunStatus } from "../../../../contracts/runtime/runs"
import { internal } from "../../../_generated/api"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { type MutationCtx } from "../../../_generated/server"
import { isWorkspaceDeleting } from "../../../retention/access"
import { type QueryLikeCtx } from "../../../shared/context"

const idleSandboxLeaseMs = 5 * 60 * 1000

type SandboxRun = { externalId: string; runId: Id<"runs"> }

async function findActiveSandbox(ctx: QueryLikeCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("sandboxes")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", runId).eq("status", "active")
    )
    .order("desc")
    .first()
}

export async function findSandboxByExternalId(
  ctx: QueryLikeCtx,
  externalId: string
) {
  return await ctx.db
    .query("sandboxes")
    .withIndex("by_external_id", (query) => query.eq("externalId", externalId))
    .first()
}

export async function findRetainedSandbox(
  ctx: QueryLikeCtx,
  runId: Id<"runs">
) {
  return (
    (await findActiveSandbox(ctx, runId)) ??
    (await ctx.db
      .query("sandboxes")
      .withIndex("by_run_and_status", (query) =>
        query.eq("runId", runId).eq("status", "idle")
      )
      .order("desc")
      .first())
  )
}

export async function upsertSandbox(ctx: MutationCtx, args: SandboxRun) {
  const run = await ctx.db.get(args.runId)

  if (run === null || (await isWorkspaceDeleting(ctx, run.organizationId))) {
    return false
  }

  const now = Date.now()
  const sessionId = (await findSessionByRun(ctx, args.runId))?._id
  const patch = {
    error: undefined,
    expiresAt: undefined,
    runId: args.runId,
    status: "active" as const,
    organizationId: run.organizationId,
    updatedAt: now,
    sessionId,
  }
  const existing = await findSandboxByExternalId(ctx, args.externalId)

  if (existing === null) {
    await ctx.db.insert("sandboxes", {
      ...patch,
      createdAt: now,
      externalId: args.externalId,
    })
  } else {
    await ctx.db.patch(existing._id, patch)
  }

  if (isTerminalRunStatus(run.status)) {
    await ctx.scheduler.runAfter(0, internal.runtime.sandbox.blaxel.kill, args)
    return false
  }

  return true
}

export async function releaseIdleSandbox(ctx: MutationCtx, args: SandboxRun) {
  const existing = await findSandboxByExternalId(ctx, args.externalId)

  if (
    existing === null ||
    existing.runId !== args.runId ||
    existing.status !== "active" ||
    existing.sessionId === undefined
  ) {
    return null
  }

  const expiresAt = Date.now() + idleSandboxLeaseMs

  await ctx.db.patch(existing._id, {
    expiresAt,
    status: "idle",
    updatedAt: Date.now(),
  })
  // The lease and the kill that ends it are set together, so an idle sandbox
  // never outlives the row that claims it.
  await ctx.scheduler.runAt(expiresAt, internal.runtime.sandbox.blaxel.kill, {
    externalId: args.externalId,
    runId: args.runId,
    expiresAt,
  })

  return { expiresAt }
}

/**
 * End a finished run's hold on its sandbox. A completed conversation run
 * leaves it idle for the next message to reuse; anything else, and any
 * sandbox the lease cannot cover, is killed now.
 */
export async function settleRunSandbox(ctx: MutationCtx, run: Doc<"runs">) {
  const sandbox = await findRetainedSandbox(ctx, run._id)

  if (sandbox === null) {
    return null
  }

  const released =
    run.status === "completed" && sandbox.sessionId !== undefined
      ? await releaseIdleSandbox(ctx, {
          externalId: sandbox.externalId,
          runId: run._id,
        })
      : null

  if (released === null) {
    await ctx.scheduler.runAfter(0, internal.runtime.sandbox.blaxel.kill, {
      externalId: sandbox.externalId,
      runId: run._id,
    })
  }

  return null
}

export async function claimReusableSandbox(
  ctx: MutationCtx,
  runId: Id<"runs">
) {
  const run = await ctx.db.get(runId)

  if (
    run === null ||
    isTerminalRunStatus(run.status) ||
    (await isWorkspaceDeleting(ctx, run.organizationId))
  ) {
    return null
  }

  const active = await findActiveSandbox(ctx, runId)

  if (active !== null) {
    return { externalId: active.externalId }
  }

  const session = await findSessionByRun(ctx, runId)

  if (session === null) {
    return null
  }

  const reusable = await findReusableSandbox(ctx, {
    now: Date.now(),
    sessionId: session._id,
  })

  if (reusable === null) {
    return null
  }

  await ctx.db.patch(reusable._id, {
    error: undefined,
    expiresAt: undefined,
    runId,
    status: "active",
    updatedAt: Date.now(),
  })

  return { externalId: reusable.externalId }
}

async function findSessionByRun(ctx: QueryLikeCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .first()
}

async function findReusableSandbox(
  ctx: MutationCtx,
  args: {
    now: number
    sessionId: Id<"sessions">
  }
) {
  return await ctx.db
    .query("sandboxes")
    .withIndex("by_session_and_status_and_expires_at", (query) =>
      query
        .eq("sessionId", args.sessionId)
        .eq("status", "idle")
        .gt("expiresAt", args.now)
    )
    .order("desc")
    .first()
}

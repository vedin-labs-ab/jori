import { type Id } from "../../../_generated/dataModel"
import { type MutationCtx } from "../../../_generated/server"
import { type QueryLikeCtx } from "../../../shared/context"
import { isTerminalRunStatus } from "../../schema"

const idleSandboxLeaseMs = 5 * 60 * 1000

type SandboxRun = { externalId: string; runId: Id<"runs"> }
type ExpiredSandboxCleanup = SandboxRun & { expiresAt: number }

async function findActiveSandbox(ctx: QueryLikeCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("sandboxes")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", runId).eq("status", "active")
    )
    .order("desc")
    .first()
}

async function findSandboxByExternalId(ctx: QueryLikeCtx, externalId: string) {
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

  if (run === null) {
    throw new Error("Run not found.")
  }

  const now = Date.now()
  const conversationId = (await findSessionByRun(ctx, args.runId))
    ?.conversationId
  const patch = {
    error: undefined,
    expiresAt: undefined,
    runId: args.runId,
    status: "active" as const,
    organizationId: run.organizationId,
    updatedAt: now,
    conversationId,
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
}

export async function releaseIdleSandbox(ctx: MutationCtx, args: SandboxRun) {
  const existing = await findSandboxByExternalId(ctx, args.externalId)

  if (
    existing === null ||
    existing.runId !== args.runId ||
    existing.status !== "active" ||
    existing.conversationId === undefined
  ) {
    return null
  }

  const expiresAt = Date.now() + idleSandboxLeaseMs

  await ctx.db.patch(existing._id, {
    expiresAt,
    status: "idle",
    updatedAt: Date.now(),
  })

  return { expiresAt }
}

export async function reserveExpiredSandboxCleanup(
  ctx: MutationCtx,
  args: ExpiredSandboxCleanup
) {
  const existing = await findSandboxByExternalId(ctx, args.externalId)

  if (
    existing === null ||
    existing.status !== "idle" ||
    existing.runId !== args.runId ||
    existing.expiresAt !== args.expiresAt ||
    existing.expiresAt > Date.now()
  ) {
    return false
  }

  await ctx.db.patch(existing._id, {
    expiresAt: undefined,
    status: "cleaned",
    updatedAt: Date.now(),
  })

  return true
}

export async function markSandboxCleaned(
  ctx: MutationCtx,
  args: { error?: string; externalId: string }
) {
  const existing = await findSandboxByExternalId(ctx, args.externalId)

  if (existing !== null) {
    await ctx.db.patch(existing._id, {
      error: args.error,
      expiresAt: undefined,
      status: args.error === undefined ? "cleaned" : "failed",
      updatedAt: Date.now(),
    })
  }

  return null
}

export async function claimReusableSandbox(
  ctx: MutationCtx,
  runId: Id<"runs">
) {
  const active = await findActiveSandbox(ctx, runId)

  if (active !== null) {
    return { externalId: active.externalId }
  }

  const run = await ctx.db.get(runId)
  const session = await findSessionByRun(ctx, runId)

  if (
    run === null ||
    session?.conversationId === undefined ||
    isTerminalRunStatus(run.status)
  ) {
    return null
  }

  const reusable = await findReusableSandbox(ctx, {
    now: Date.now(),
    organizationId: run.organizationId,
    conversationId: session.conversationId,
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
    organizationId: string
    conversationId: Id<"conversations">
  }
) {
  return await ctx.db
    .query("sandboxes")
    .withIndex(
      "by_organization_and_conversation_and_status_and_expires_at",
      (query) =>
        query
          .eq("organizationId", args.organizationId)
          .eq("conversationId", args.conversationId)
          .eq("status", "idle")
          .gt("expiresAt", args.now)
    )
    .order("desc")
    .first()
}

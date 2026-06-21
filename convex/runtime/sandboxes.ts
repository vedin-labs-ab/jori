import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
} from "../_generated/server"
import { requireWorkerSecret } from "./shared"

const idleSandboxLeaseMs = 5 * 60 * 1000

type SandboxRun = { externalId: string; runId: Id<"runs"> }
type ExpiredSandboxCleanup = SandboxRun & { expiresAt: number }

export const upsert = mutation({
  args: {
    externalId: v.string(),
    runId: v.id("runs"),
    secret: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    await upsertSandbox(ctx, args)

    return null
  },
})

export const release = mutation({
  args: {
    externalId: v.string(),
    runId: v.id("runs"),
    secret: v.string(),
  },
  returns: v.union(
    v.object({
      expiresAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    return await releaseIdleSandbox(ctx, args)
  },
})

export const reserveExpiredCleanup = mutation({
  args: {
    expiresAt: v.number(),
    externalId: v.string(),
    runId: v.id("runs"),
    secret: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    return await reserveExpiredSandboxCleanup(ctx, args)
  },
})

export const claimForRun = internalMutation({
  args: {
    runId: v.id("runs"),
  },
  returns: v.union(v.object({ externalId: v.string() }), v.null()),
  handler: async (ctx, args) => {
    return await claimReusableSandbox(ctx, args.runId)
  },
})

export const markCleaned = mutation({
  args: {
    error: v.optional(v.string()),
    externalId: v.string(),
    secret: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

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
  },
})

export const retainedByRun = internalQuery({
  args: {
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return (
      (await findActiveSandbox(ctx, args.runId)) ??
      (await ctx.db
        .query("sandboxes")
        .withIndex("by_run_and_status", (query) =>
          query.eq("runId", args.runId).eq("status", "idle")
        )
        .order("desc")
        .first())
    )
  },
})

export async function upsertSandbox(ctx: MutationCtx, args: SandboxRun) {
  const run = await ctx.db.get(args.runId)

  if (run === null) {
    throw new Error("Run not found.")
  }

  const now = Date.now()
  const watchId = (await findSessionByRun(ctx, args.runId))?.watchId
  const patch = {
    error: undefined,
    expiresAt: undefined,
    runId: args.runId,
    status: "active" as const,
    tenantId: run.tenantId,
    updatedAt: now,
    watchId,
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
    existing.watchId === undefined
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

  if (run === null || session === null || isTerminalRun(run)) {
    return null
  }

  const reusable = await findReusableSandbox(ctx, {
    now: Date.now(),
    tenantId: run.tenantId,
    watchId: session.watchId,
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

export async function findActiveSandbox(
  ctx: MutationCtx | QueryCtx,
  runId: Id<"runs">
): Promise<Doc<"sandboxes"> | null> {
  return await ctx.db
    .query("sandboxes")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", runId).eq("status", "active")
    )
    .order("desc")
    .first()
}

async function findReusableSandbox(
  ctx: MutationCtx,
  args: {
    now: number
    tenantId: string
    watchId: Id<"watches">
  }
) {
  return await ctx.db
    .query("sandboxes")
    .withIndex("by_tenant_and_watch_and_status_and_expires_at", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("watchId", args.watchId)
        .eq("status", "idle")
        .gt("expiresAt", args.now)
    )
    .order("desc")
    .first()
}

async function findSandboxByExternalId(
  ctx: MutationCtx | QueryCtx,
  externalId: string
) {
  return await ctx.db
    .query("sandboxes")
    .withIndex("by_external_id", (query) => query.eq("externalId", externalId))
    .first()
}

async function findSessionByRun(ctx: MutationCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .first()
}

function isTerminalRun(run: Doc<"runs">) {
  return ["completed", "failed", "stopped"].includes(run.status)
}

import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
} from "../_generated/server"
import {
  findActiveSandbox,
  findSandboxByExternalId,
  findSessionByRun,
  isTerminalRun,
} from "./sandbox_lookup"
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
  const conversationId = (await findSessionByRun(ctx, args.runId))
    ?.conversationId
  const patch = {
    error: undefined,
    expiresAt: undefined,
    runId: args.runId,
    status: "active" as const,
    tenantId: run.tenantId,
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
    isTerminalRun(run)
  ) {
    return null
  }

  const reusable = await findReusableSandbox(ctx, {
    now: Date.now(),
    tenantId: run.tenantId,
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

async function findReusableSandbox(
  ctx: MutationCtx,
  args: {
    now: number
    tenantId: string
    conversationId: Id<"conversations">
  }
) {
  return await ctx.db
    .query("sandboxes")
    .withIndex(
      "by_tenant_and_conversation_and_status_and_expires_at",
      (query) =>
        query
          .eq("tenantId", args.tenantId)
          .eq("conversationId", args.conversationId)
          .eq("status", "idle")
          .gt("expiresAt", args.now)
    )
    .order("desc")
    .first()
}

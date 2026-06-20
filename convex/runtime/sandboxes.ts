import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import {
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
} from "../_generated/server"
import { requireWorkerSecret } from "./shared"

const activeSandboxStatuses = new Set(["created", "running", "reconnected"])

export const upsert = mutation({
  args: {
    runId: v.id("runs"),
    sandboxId: v.string(),
    secret: v.string(),
    status: v.union(
      v.literal("created"),
      v.literal("running"),
      v.literal("reconnected")
    ),
    traceHost: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const run = await ctx.db.get(args.runId)

    if (run === null) {
      throw new Error("Run not found.")
    }

    const existing = await ctx.db
      .query("sandboxes")
      .withIndex("by_sandbox", (query) => query.eq("sandboxId", args.sandboxId))
      .first()
    const now = Date.now()

    if (existing === null) {
      await ctx.db.insert("sandboxes", {
        tenantId: run.tenantId,
        runId: args.runId,
        provider: "e2b",
        sandboxId: args.sandboxId,
        status: args.status,
        traceHost: args.traceHost,
        createdAt: now,
        updatedAt: now,
      })
    } else {
      await ctx.db.patch(existing._id, {
        status: args.status,
        traceHost: args.traceHost,
        updatedAt: now,
      })
    }

    return null
  },
})

export const markCleaned = mutation({
  args: {
    error: v.optional(v.string()),
    sandboxId: v.string(),
    secret: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const existing = await ctx.db
      .query("sandboxes")
      .withIndex("by_sandbox", (query) => query.eq("sandboxId", args.sandboxId))
      .first()

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        cleanedAt: Date.now(),
        lastError: args.error,
        status: args.error === undefined ? "cleaned" : "failed",
        updatedAt: Date.now(),
      })
    }

    return null
  },
})

export const activeByRun = internalQuery({
  args: {
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await findActiveSandbox(ctx, args.runId)
  },
})

export async function findActiveSandbox(
  ctx: MutationCtx | QueryCtx,
  runId: Id<"runs">
) {
  const sandboxes = ctx.db
    .query("sandboxes")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .order("desc")

  for await (const sandbox of sandboxes) {
    if (activeSandboxStatuses.has(sandbox.status)) {
      return sandbox
    }
  }

  return null
}

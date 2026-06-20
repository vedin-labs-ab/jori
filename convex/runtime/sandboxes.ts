import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
} from "../_generated/server"
import { requireWorkerSecret } from "./shared"

export const upsert = mutation({
  args: {
    externalId: v.string(),
    runId: v.id("runs"),
    secret: v.string(),
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
      .withIndex("by_external_id", (query) =>
        query.eq("externalId", args.externalId)
      )
      .first()
    const now = Date.now()

    if (existing === null) {
      await ctx.db.insert("sandboxes", {
        tenantId: run.tenantId,
        runId: args.runId,
        externalId: args.externalId,
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
    } else {
      await ctx.db.patch(existing._id, {
        error: undefined,
        runId: args.runId,
        status: "active",
        tenantId: run.tenantId,
        updatedAt: now,
      })
    }

    return null
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

    const existing = await ctx.db
      .query("sandboxes")
      .withIndex("by_external_id", (query) =>
        query.eq("externalId", args.externalId)
      )
      .first()

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        error: args.error,
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
): Promise<Doc<"sandboxes"> | null> {
  return await ctx.db
    .query("sandboxes")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", runId).eq("status", "active")
    )
    .order("desc")
    .first()
}

import { v } from "convex/values"
import { mutation } from "../_generated/server"
import {
  markSandboxCleaned,
  releaseIdleSandbox,
  reserveExpiredSandboxCleanup,
  upsertSandbox,
} from "../runs/execution/sandboxes/data"
import { requireWorkerSecret } from "./secret"

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
  returns: v.union(v.object({ expiresAt: v.number() }), v.null()),
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

export const markCleaned = mutation({
  args: {
    error: v.optional(v.string()),
    externalId: v.string(),
    secret: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    return await markSandboxCleaned(ctx, args)
  },
})

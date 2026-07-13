import { v } from "convex/values"
import { internalMutation, internalQuery, mutation } from "../_generated/server"
import {
  claimReusableSandbox,
  findRetainedSandbox,
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

    return await markSandboxCleaned(ctx, args)
  },
})

export const retainedByRun = internalQuery({
  args: {
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await findRetainedSandbox(ctx, args.runId)
  },
})

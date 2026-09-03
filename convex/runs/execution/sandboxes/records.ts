import { v } from "convex/values"
import { internalMutation, internalQuery } from "../../../_generated/server"
import {
  claimReusableSandbox,
  findRetainedSandbox,
  markSandboxCleaned,
  releaseIdleSandbox,
  reserveExpiredSandboxCleanup,
  upsertSandbox,
} from "./data"

export const claimForRun = internalMutation({
  args: {
    runId: v.id("runs"),
  },
  returns: v.union(v.object({ externalId: v.string() }), v.null()),
  handler: async (ctx, args) => {
    return await claimReusableSandbox(ctx, args.runId)
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

export const upsert = internalMutation({
  args: {
    externalId: v.string(),
    runId: v.id("runs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await upsertSandbox(ctx, args)

    return null
  },
})

export const release = internalMutation({
  args: {
    externalId: v.string(),
    runId: v.id("runs"),
  },
  returns: v.union(v.object({ expiresAt: v.number() }), v.null()),
  handler: async (ctx, args) => {
    return await releaseIdleSandbox(ctx, args)
  },
})

export const reserve = internalMutation({
  args: {
    expiresAt: v.number(),
    externalId: v.string(),
    runId: v.id("runs"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    return await reserveExpiredSandboxCleanup(ctx, args)
  },
})

export const cleaned = internalMutation({
  args: {
    error: v.optional(v.string()),
    externalId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await markSandboxCleaned(ctx, args)
  },
})

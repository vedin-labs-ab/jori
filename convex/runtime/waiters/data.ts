import { v } from "convex/values"
import { internalQuery, mutation } from "../../_generated/server"
import {
  createWaiter,
  expireWaiter,
  getWaiter,
} from "../../runs/execution/waiters/data"
import { waiterCondition } from "../../runs/execution/waiters/schema"
import { requireWorkerSecret } from "../shared"

export const create = mutation({
  args: {
    secret: v.string(),
    runId: v.id("runs"),
    sessionId: v.optional(v.id("sessions")),
    waitpointId: v.string(),
    expiresAt: v.number(),
    condition: v.optional(waiterCondition),
  },
  returns: v.id("waiters"),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    return await createWaiter(ctx, args)
  },
})

export const expire = mutation({
  args: {
    secret: v.string(),
    waiterId: v.id("waiters"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    return await expireWaiter(ctx, args.waiterId)
  },
})

export const get = internalQuery({
  args: {
    waiterId: v.id("waiters"),
  },
  handler: async (ctx, args) => {
    return await getWaiter(ctx, args.waiterId)
  },
})

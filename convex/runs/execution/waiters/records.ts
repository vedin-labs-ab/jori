import { v } from "convex/values"
import { internalMutation, internalQuery } from "../../../_generated/server"
import { expireWaiter, parkRun, resolveWaiter, wakeCommandWaiter } from "./data"
import { waiterCondition } from "./schema"

export const get = internalQuery({
  args: {
    waiterId: v.id("waiters"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.waiterId)
  },
})

export const park = internalMutation({
  args: {
    runId: v.id("runs"),
    sessionId: v.optional(v.id("sessions")),
    expiresAt: v.number(),
    condition: v.optional(waiterCondition),
    token: v.optional(v.string()),
  },
  returns: v.object({
    waiterId: v.id("waiters"),
    eventId: v.string(),
  }),
  handler: async (ctx, args) => {
    return await parkRun(ctx, args)
  },
})

export const resolve = internalMutation({
  args: {
    waiterId: v.id("waiters"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await resolveWaiter(ctx, args.waiterId)
  },
})

export const expire = internalMutation({
  args: {
    waiterId: v.id("waiters"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await expireWaiter(ctx, args.waiterId)
  },
})

export const wakeCommand = internalMutation({
  args: {
    token: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await wakeCommandWaiter(ctx, args.token)

    return null
  },
})

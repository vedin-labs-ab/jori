import { v } from "convex/values"
import { internalMutation } from "../../../_generated/server"
import {
  claimNext as claimNextOperation,
  markFailed as markOperationFailed,
  markSent as markOperationSent,
} from "./data"

export const claimNext = internalMutation({
  args: {
    now: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await claimNextOperation(ctx, args.now)
  },
})

export const markSent = internalMutation({
  args: {
    outboxId: v.id("outbox"),
    receiptId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await markOperationSent(ctx, args)
  },
})

export const markFailed = internalMutation({
  args: {
    error: v.string(),
    outboxId: v.id("outbox"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await markOperationFailed(ctx, args)
  },
})

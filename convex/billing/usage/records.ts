import { v } from "convex/values"
import { internalMutation } from "../../_generated/server"
import { meterPricedUsage } from "../meter"
import { providerUsage } from "./schema"

export const record = internalMutation({
  args: { ...providerUsage, runId: v.id("runs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    if (run === null) {
      throw new Error("Run not found.")
    }
    const values = [args.micros, args.tokens.input, args.tokens.output]
    if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error("Provider usage must contain non-negative integers.")
    }
    const existing = await ctx.db
      .query("usageReceipts")
      .withIndex("by_provider_and_request", (query) =>
        query.eq("provider", args.provider).eq("requestId", args.requestId)
      )
      .unique()
    if (existing !== null) {
      if (
        existing.runId !== run._id ||
        existing.micros !== args.micros ||
        existing.model !== args.model ||
        existing.tokens.input !== args.tokens.input ||
        existing.tokens.output !== args.tokens.output
      ) {
        throw new Error(
          "Provider usage receipt conflicts with an earlier charge."
        )
      }
      return null
    }
    await ctx.db.insert("usageReceipts", {
      ...args,
      organizationId: run.organizationId,
    })
    // A stopped run still owes for a provider request already completed.
    await meterPricedUsage(ctx, { ...args, run })
    return null
  },
})

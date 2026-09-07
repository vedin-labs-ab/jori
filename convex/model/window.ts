import { v } from "convex/values"
import { modelContextFallback } from "../../contracts/billing"
import { internalMutation } from "../_generated/server"
import { type QueryLikeCtx } from "../shared/context"

export type ModelWindow = {
  contextLength: number
  maxCompletionTokens: number | null
}

/** The model's window as last fetched, or the fallback when no refresh
 *  has run yet. Input and output share the window. */
export async function modelWindow(
  ctx: QueryLikeCtx,
  model: string
): Promise<ModelWindow> {
  const row = await findModel(ctx, model)

  if (row === null) {
    return {
      contextLength: modelContextFallback.contextLength,
      maxCompletionTokens: null,
    }
  }

  return {
    contextLength: row.contextLength,
    maxCompletionTokens: row.maxCompletionTokens ?? null,
  }
}

export const upsert = internalMutation({
  args: {
    model: v.string(),
    contextLength: v.number(),
    maxCompletionTokens: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await findModel(ctx, args.model)
    const row = { ...args, fetchedAt: Date.now() }

    if (existing === null) {
      await ctx.db.insert("models", row)
    } else {
      await ctx.db.replace(existing._id, row)
    }

    return null
  },
})

async function findModel(ctx: QueryLikeCtx, model: string) {
  return await ctx.db
    .query("models")
    .withIndex("by_model", (query) => query.eq("model", model))
    .unique()
}

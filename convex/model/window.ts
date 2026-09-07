import { v } from "convex/values"
import { catalogModel } from "../../contracts/models/catalog"
import { internalMutation } from "../_generated/server"
import { type QueryLikeCtx } from "../shared/context"
import { modelRateValidator } from "./schema"

export type ModelWindow = {
  contextLength: number
  maxCompletionTokens: number | null
}

/** The model's window as last fetched, or the catalog's until a refresh
 *  has run. Input and output share the window. */
export async function modelWindow(
  ctx: QueryLikeCtx,
  model: string
): Promise<ModelWindow> {
  const listed = (await findModel(ctx, model)) ?? catalogModel(model)

  return {
    contextLength: listed.contextLength,
    maxCompletionTokens: listed.maxCompletionTokens ?? null,
  }
}

export const upsert = internalMutation({
  args: {
    model: v.string(),
    contextLength: v.number(),
    maxCompletionTokens: v.optional(v.number()),
    rate: modelRateValidator,
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

export async function findModel(ctx: QueryLikeCtx, model: string) {
  return await ctx.db
    .query("models")
    .withIndex("by_model", (query) => query.eq("model", model))
    .unique()
}

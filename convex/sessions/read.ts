import { type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"

export async function findSession(
  ctx: QueryLikeCtx,
  conversationId: Id<"conversations">
) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_conversation", (query) =>
      query.eq("conversationId", conversationId)
    )
    .first()
}

export async function findSessionByRun(ctx: QueryLikeCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .first()
}

import { type Id } from "../../../_generated/dataModel"
import { type MutationCtx } from "../../../_generated/server"
import { type QueryLikeCtx } from "../../../shared/context"

/** The run's draft text as it stands, or nothing when no reply is being
 *  composed. */
export async function readRunDraft(ctx: QueryLikeCtx, runId: Id<"runs">) {
  return (await findRunDraft(ctx, runId))?.text ?? null
}

/** Replace the run's draft with the text so far. */
export async function writeRunDraft(
  ctx: MutationCtx,
  args: { runId: Id<"runs">; text: string; turn: number }
) {
  const existing = await findRunDraft(ctx, args.runId)
  const updatedAt = Date.now()

  if (existing === null) {
    await ctx.db.insert("drafts", { ...args, updatedAt })

    return
  }

  await ctx.db.patch(existing._id, {
    text: args.text,
    turn: args.turn,
    updatedAt,
  })
}

export async function clearRunDraft(ctx: MutationCtx, runId: Id<"runs">) {
  const existing = await findRunDraft(ctx, runId)

  if (existing !== null) {
    await ctx.db.delete(existing._id)
  }
}

function findRunDraft(ctx: QueryLikeCtx, runId: Id<"runs">) {
  return ctx.db
    .query("drafts")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .unique()
}

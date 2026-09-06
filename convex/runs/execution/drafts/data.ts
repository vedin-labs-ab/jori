import { type Id } from "../../../_generated/dataModel"
import { type MutationCtx } from "../../../_generated/server"
import { type QueryLikeCtx } from "../../../shared/context"

/** What a run has said of its reply so far: the reasoning it is thinking
 *  through, then the text. */
export type RunDraft = {
  reasoning: string
  text: string
}

/** The run's draft as it stands, or nothing when no reply is being
 *  composed. A row that says nothing yet, neither text nor reasoning, reads
 *  as no draft too, so the console never shows an empty turn. */
export async function readRunDraft(
  ctx: QueryLikeCtx,
  runId: Id<"runs">
): Promise<RunDraft | null> {
  const draft = await findRunDraft(ctx, runId)

  if (draft === null) {
    return null
  }

  const reasoning = draft.reasoning ?? ""

  return draft.text === "" && reasoning.trim() === ""
    ? null
    : { reasoning, text: draft.text }
}

/** Replace the run's draft with the reply so far. */
export async function writeRunDraft(
  ctx: MutationCtx,
  args: RunDraft & { runId: Id<"runs">; turn: number }
) {
  const existing = await findRunDraft(ctx, args.runId)
  const updatedAt = Date.now()

  if (existing === null) {
    await ctx.db.insert("drafts", { ...args, updatedAt })

    return
  }

  await ctx.db.patch(existing._id, {
    reasoning: args.reasoning,
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

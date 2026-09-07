import { joriModel } from "../../contracts/billing"
import { type Doc, type Id } from "../_generated/dataModel"
import { modelWindow } from "../model/window"
import { readRunDraft } from "../runs/execution/drafts/data"
import { findSession } from "../sessions/data"
import { type QueryLikeCtx } from "../shared/context"

/** How much of the model's window the thread's latest run is using, with
 *  the last turn's breakdown for the indicator's popover, and whether the
 *  run condensed earlier context to keep going. */
export type LiveContext = {
  condensed: boolean
  model: string
  runId: Id<"runs">
  turn: {
    cached: number
    input: number
    output: number
    reasoning: number
  } | null
  usedTokens: number
  windowTokens: number
}

/**
 * The session's run — how it stands, and how it ended when it did not
 * finish — the draft of the reply it is writing (the reasoning while the
 * model thinks, then the text, and nothing before either has been said),
 * and the context use of the thread's current or most recent run.
 */
export async function readLiveState(
  ctx: QueryLikeCtx,
  conversation: Doc<"conversations">
) {
  const session = await findSession(ctx, conversation._id)
  const run =
    session?.runId === undefined ? null : await ctx.db.get(session.runId)
  const latest = run ?? (await latestConversationRun(ctx, conversation._id))

  return {
    run: run === null ? null : liveRun(run),
    draft: run === null ? null : await readRunDraft(ctx, run._id),
    context: latest === null ? null : await readLiveContext(ctx, latest),
  }
}

function liveRun(run: Doc<"runs">) {
  return {
    id: run._id,
    status: run.status,
    ...(run.error === undefined ? {} : { error: run.error }),
    ...(run.endedAt === undefined ? {} : { endedAt: run.endedAt }),
  }
}

async function readLiveContext(
  ctx: QueryLikeCtx,
  run: Doc<"runs">
): Promise<LiveContext> {
  const window = await modelWindow(ctx, joriModel)
  const turn = run.turnTokens
  const compaction = run.compaction

  return {
    condensed:
      compaction?.clearedBefore !== undefined ||
      compaction?.summary !== undefined,
    model: joriModel,
    runId: run._id,
    turn:
      turn === undefined
        ? null
        : {
            cached: turn.cacheRead,
            input: turn.input,
            output: turn.output,
            reasoning: turn.reasoning,
          },
    usedTokens: run.promptTokens ?? 0,
    windowTokens: window.contextLength,
  }
}

async function latestConversationRun(
  ctx: QueryLikeCtx,
  conversationId: Id<"conversations">
) {
  return await ctx.db
    .query("runs")
    .withIndex("by_conversation_and_created_at", (query) =>
      query.eq("conversationId", conversationId)
    )
    .order("desc")
    .first()
}

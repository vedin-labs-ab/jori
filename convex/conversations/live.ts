import { type Doc, type Id } from "../_generated/dataModel"
import { runModel, runSelection } from "../model/selection"
import { modelWindow } from "../model/window"
import { findSession } from "../sessions/data"
import { sessionExecutionIsCurrent } from "../sessions/execution"
import { type QueryLikeCtx } from "../shared/context"

/** How much of the model's window the thread's latest run is using, with
 *  the last turn's breakdown for the indicator's popover, and whether the
 *  run condensed earlier context to keep going. */
type LiveContext = {
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
 * finish — the context use of the thread's current or most recent run,
 * and the selection the thread's next run will use. The reply the run is
 * writing is `conversations.draft.get`'s, read apart from this so its
 * every write re-renders the turn alone.
 */
export async function readLiveState(
  ctx: QueryLikeCtx,
  conversation: Doc<"conversations">
) {
  const session = await findSession(ctx, conversation._id)
  if (
    session !== null &&
    !(await sessionExecutionIsCurrent(ctx, session, conversation))
  ) {
    return { run: null, context: null, model: runSelection(conversation) }
  }
  const run =
    session?.runId === undefined ? null : await ctx.db.get(session.runId)
  const latest = run ?? (await latestConversationRun(ctx, conversation._id))

  return {
    run: run === null ? null : liveRun(run),
    context: latest === null ? null : await readLiveContext(ctx, latest),
    model: runSelection(conversation),
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
  const model = runModel(run)
  const window = await modelWindow(ctx, model)
  const turn = run.turnTokens
  const compaction = run.compaction

  return {
    condensed:
      compaction?.clearedBefore !== undefined ||
      compaction?.summary !== undefined,
    model,
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

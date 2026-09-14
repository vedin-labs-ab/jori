import { v } from "convex/values"
import {
  type DrainedSessionBatch,
  type RuntimeMessage,
} from "../../contracts/runtime/context"
import { isTerminalRunStatus } from "../../contracts/runtime/runs"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import {
  defaultReactionDrainLimit,
  formatRuntimeReaction,
  readPendingReactions,
} from "../reactions/cursor"
import { boundedNumber } from "../shared/input"
import { defaultDrainLimit, maxDrainLimit } from "./batch"
import { cursorWithMessage, cursorWithReaction } from "./cursor"
import { readPendingBatch } from "./data"
import { reconcileRunExecution } from "./execution"
import { formatSessionMessages } from "./messages"
import { emitRecencyContexts, type RecencyEmission } from "./recency"
import { runExecutionIsCurrent } from "./scope"

export const messages = internalMutation({
  args: {
    limit: v.optional(v.number()),
    sessionId: v.id("sessions"),
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await drainSession(ctx, args)
  },
})

export async function drainSession(
  ctx: MutationCtx,
  args: {
    limit?: number
    sessionId: Id<"sessions">
    runId: Id<"runs">
  }
): Promise<DrainedSessionBatch> {
  const session = await ctx.db.get(args.sessionId)

  if (session?.runId !== args.runId) {
    return { contexts: [], hasMore: false, interactions: [], messages: [] }
  }

  const run = await ctx.db.get(args.runId)

  if (
    run === null ||
    isTerminalRunStatus(run.status) ||
    !(await runExecutionIsCurrent(ctx, run))
  ) {
    if (run !== null) {
      await reconcileRunExecution(ctx, run)
    }
    return { contexts: [], hasMore: false, interactions: [], messages: [] }
  }

  const limit = boundedNumber(args.limit, defaultDrainLimit, 1, maxDrainLimit)
  const batch = await readPendingBatch(ctx, session, limit)
  const reactions = await readPendingReactions(
    ctx,
    session,
    args.limit ?? defaultReactionDrainLimit
  )
  const emission = await emitRecencyContexts(ctx, session, batch.messages)
  const cursor = nextSessionCursor(session.cursor, {
    message: batch.cursor,
    reaction: reactions.cursor,
  })
  const messages = await formatSessionMessages(
    ctx,
    session.conversationId,
    batch.messages
  )

  await patchSession(ctx, session, {
    cursor,
    emission,
    target: lastReplyTarget(messages),
  })

  return {
    contexts: emission === null ? [] : emission.contexts,
    hasMore: batch.hasMore || reactions.hasMore,
    interactions: reactions.reactions.map(formatRuntimeReaction),
    messages,
  }
}

/** The run answers where the conversation last spoke, so a thread that moves
 *  mid-run takes the reply with it. */
function lastReplyTarget(messages: RuntimeMessage[]) {
  return messages.reduce<string | undefined>(
    (target, message) => message.replyTarget ?? target,
    undefined
  )
}

async function patchSession(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  updates: {
    cursor: Doc<"sessions">["cursor"] | undefined
    emission: RecencyEmission | null
    target: string | undefined
  }
) {
  const { cursor, emission, target } = updates

  if (cursor === undefined && emission === null && target === undefined) {
    return
  }

  await ctx.db.patch(session._id, {
    ...(cursor === undefined ? {} : { cursor }),
    ...(emission === null ? {} : { recency: emission.recency }),
    ...(target === undefined ? {} : { target }),
    updatedAt: Date.now(),
  })
}

function nextSessionCursor(
  cursor: Doc<"sessions">["cursor"],
  updates: {
    message?: Doc<"messages">
    reaction?: Doc<"reactions">
  }
) {
  let next = cursor

  if (updates.message !== undefined) {
    next = cursorWithMessage(next, updates.message)
  }

  if (updates.reaction !== undefined) {
    next = cursorWithReaction(next, updates.reaction)
  }

  return next === cursor ? undefined : next
}

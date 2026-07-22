import { v } from "convex/values"
import { type DrainedSessionBatch } from "../../contracts/runtime/worker"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import {
  defaultReactionDrainLimit,
  formatRuntimeReaction,
  readPendingReactions,
} from "../reactions/cursor"
import { reactionSummariesForMessages } from "../reactions/summary"
import { type QueryLikeCtx } from "../shared/context"
import { boundedNumber } from "../shared/input"
import {
  defaultDrainLimit,
  formatRuntimeMessage,
  maxDrainLimit,
} from "./cursor"
import { cursorWithMessage, cursorWithReaction } from "./cursors"
import { readPendingBatch } from "./data"
import { emitRecencyContexts, type RecencyEmission } from "./recency"

export const messages = internalMutation({
  args: {
    limit: v.optional(v.number()),
    sessionId: v.id("sessions"),
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
  }
): Promise<DrainedSessionBatch> {
  const session = await ctx.db.get(args.sessionId)

  if (session?.runId === undefined) {
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

  await patchSession(ctx, session, cursor, emission)

  return {
    contexts: emission === null ? [] : emission.contexts,
    hasMore: batch.hasMore || reactions.hasMore,
    interactions: reactions.reactions.map(formatRuntimeReaction),
    messages: await formatRuntimeMessages(ctx, batch.messages),
  }
}

async function patchSession(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  cursor: Doc<"sessions">["cursor"] | undefined,
  emission: RecencyEmission | null
) {
  if (cursor === undefined && emission === null) {
    return
  }

  await ctx.db.patch(session._id, {
    ...(cursor === undefined ? {} : { cursor }),
    ...(emission === null ? {} : { recency: emission.recency }),
    updatedAt: Date.now(),
  })
}

async function formatRuntimeMessages(
  ctx: QueryLikeCtx,
  messages: Doc<"messages">[]
) {
  const reactions = await reactionSummariesForMessages(ctx, messages)

  return messages.map((message) =>
    formatRuntimeMessage(message, reactions.get(message._id))
  )
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

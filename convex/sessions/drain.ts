import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import {
  defaultReactionDrainLimit,
  formatRuntimeReaction,
  readPendingReactions,
} from "../reactions/cursor"
import { reactionSummariesForMessages } from "../reactions/summary"
import { type QueryLikeCtx } from "../shared/context"
import { formatRuntimeMessage, normalizeLimit } from "./cursor"
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
) {
  const session = await ctx.db.get(args.sessionId)

  if (session?.runId === undefined) {
    return { contexts: [], hasMore: false, interactions: [], messages: [] }
  }

  const limit = normalizeLimit(args.limit)
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
    messages: await formatRuntimeMessages(ctx, batch.messages, session),
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
  messages: Doc<"messages">[],
  session: Doc<"sessions">
) {
  const result: ReturnType<typeof formatRuntimeMessage>[] = []
  const integration = await getSessionIntegration(ctx, session)
  const reactions = await reactionSummariesForMessages(ctx, messages)

  for (const message of messages) {
    result.push(
      formatRuntimeMessage(message, integration, reactions.get(message._id))
    )
  }

  return result
}

async function getSessionIntegration(
  ctx: QueryLikeCtx,
  session: Doc<"sessions">
) {
  if (session.conversationId === undefined) {
    return null
  }

  const conversation = await ctx.db.get(session.conversationId)

  return conversation === null
    ? null
    : await ctx.db.get(conversation.integrationId)
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

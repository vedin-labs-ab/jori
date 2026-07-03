import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"
import {
  defaultReactionDrainLimit,
  formatRuntimeReaction,
  readPendingReactions,
} from "../reactions/cursor"
import { reactionSummariesForMessages } from "../reactions/summary"
import { isTerminalRunStatus } from "../runs/schema"
import {
  collectPendingBatch,
  defaultDrainLimit,
  formatRuntimeMessage,
  maxPendingReadLimit,
  normalizeLimit,
  type PendingBatch,
} from "./cursor"
import { cursorWithMessage, cursorWithReaction, initialCursor } from "./cursors"

type QueryLikeCtx = MutationCtx | QueryCtx

export async function findReusableSession(
  ctx: MutationCtx,
  conversationId: Id<"conversations">
) {
  const session = await findSession(ctx, conversationId)

  return session === null ? null : await isReusableSession(ctx, session)
}

export async function isReusableSession(
  ctx: MutationCtx,
  session: Doc<"sessions">
) {
  if (session.runId === undefined) {
    return null
  }

  const run = await ctx.db.get(session.runId)

  return run === null || isTerminalRunStatus(run.status) ? null : session
}

export async function startSession(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">
    message: Doc<"messages">
    now: number
    runId: Id<"runs">
  }
) {
  const existing = await findSession(ctx, args.conversationId)
  const patch = {
    cursor: initialCursor(args.message, args.now),
    runId: args.runId,
    updatedAt: args.now,
  }

  if (existing !== null) {
    await ctx.db.patch(existing._id, patch)
    return existing._id
  }

  return await ctx.db.insert("sessions", {
    conversationId: args.conversationId,
    ...patch,
  })
}

export async function stopSession(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  now: number
) {
  await ctx.db.patch(session._id, {
    runId: undefined,
    updatedAt: now,
  })
}

export async function readPendingMessages(
  ctx: QueryLikeCtx,
  session: Doc<"sessions">,
  limit = defaultDrainLimit
) {
  const batch = await readPendingBatch(ctx, session, limit)

  return batch.messages
}

async function readPendingBatch(
  ctx: QueryLikeCtx,
  session: Doc<"sessions">,
  limit = defaultDrainLimit
): Promise<PendingBatch> {
  if (session.conversationId === undefined) {
    return { hasMore: false, messages: [] }
  }

  const conversation = await ctx.db.get(session.conversationId)

  if (conversation === null) {
    return { hasMore: false, messages: [] }
  }

  const takeLimit = Math.min(Math.max(1, limit), maxPendingReadLimit)
  const candidates = await queryConversationMessages(ctx, {
    session,
    limit: maxPendingReadLimit + 1,
    conversation,
  })
  const scanned = candidates.slice(0, maxPendingReadLimit)

  return collectPendingBatch(
    scanned,
    session,
    takeLimit,
    candidates.length > maxPendingReadLimit
  )
}

export const getByRun = internalQuery({
  args: {
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_run", (query) => query.eq("runId", args.runId))
      .first()
  },
})

export const drainMessages = internalMutation({
  args: {
    limit: v.optional(v.number()),
    sessionId: v.id("sessions"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)

    if (session?.runId === undefined) {
      return { hasMore: false, interactions: [], messages: [] }
    }

    const limit = normalizeLimit(args.limit)
    const batch = await readPendingBatch(ctx, session, limit)
    const reactions = await readPendingReactions(
      ctx,
      session,
      args.limit ?? defaultReactionDrainLimit
    )
    const cursor = nextSessionCursor(session.cursor, {
      message: batch.cursor,
      reaction: reactions.cursor,
    })

    if (cursor !== undefined) {
      await ctx.db.patch(session._id, {
        cursor,
        updatedAt: Date.now(),
      })
    }

    return {
      hasMore: batch.hasMore || reactions.hasMore,
      interactions: reactions.reactions.map(formatRuntimeReaction),
      messages: await formatRuntimeMessages(ctx, batch.messages, session),
    }
  },
})

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

async function queryConversationMessages(
  ctx: QueryLikeCtx,
  args: {
    limit: number
    session: Doc<"sessions">
    conversation: Doc<"conversations">
  }
) {
  return await ctx.db
    .query("messages")
    .withIndex("by_conversation", (query) => {
      const cursor = args.session.cursor?.message
      const scoped = query
        .eq("tenantId", args.conversation.tenantId)
        .eq("integrationId", args.conversation.integrationId)
        .eq("conversationId", args.conversation.externalId)

      return cursor === undefined
        ? scoped
        : scoped.gte("_creationTime", cursor.createdAt)
    })
    .order("asc")
    .take(args.limit)
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

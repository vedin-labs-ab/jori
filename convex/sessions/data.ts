import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"
import {
  collectPendingBatch,
  defaultDrainLimit,
  formatRuntimeMessage,
  maxPendingReadLimit,
  normalizeLimit,
  type PendingBatch,
} from "./cursor"

type QueryLikeCtx = MutationCtx | QueryCtx

export async function findReusableSession(
  ctx: MutationCtx,
  conversationId: Id<"conversations">
) {
  const session = await findSession(ctx, conversationId)

  if (session?.runId === undefined) {
    return null
  }

  const run = await ctx.db.get(session.runId)

  return run === null || isTerminalStatus(run.status) ? null : session
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
    cursor: messageCursor(args.message),
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
  const conversation = await ctx.db.get(session.conversationId)

  if (conversation === null) {
    return { hasMore: false, messages: [] }
  }

  const takeLimit = Math.min(Math.max(1, limit), maxPendingReadLimit)
  const candidates = await queryConversationMessages(ctx, {
    conversation,
    session,
    limit: maxPendingReadLimit + 1,
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
      return { hasMore: false, messages: [] }
    }

    const limit = normalizeLimit(args.limit)
    const batch = await readPendingBatch(ctx, session, limit)

    if (batch.cursor !== undefined) {
      await ctx.db.patch(session._id, {
        cursor: messageCursor(batch.cursor),
        updatedAt: Date.now(),
      })
    }

    return {
      hasMore: batch.hasMore,
      messages: await formatRuntimeMessages(ctx, batch.messages),
    }
  },
})

async function formatRuntimeMessages(
  ctx: MutationCtx,
  messages: Doc<"messages">[]
) {
  const result: ReturnType<typeof formatRuntimeMessage>[] = []

  for (const message of messages) {
    result.push(formatRuntimeMessage(message, await findRouting(ctx, message)))
  }

  return result
}

async function findRouting(ctx: MutationCtx, message: Doc<"messages">) {
  return await ctx.db
    .query("routing")
    .withIndex("by_message", (query) => query.eq("messageId", message._id))
    .first()
}

async function findSession(
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
    conversation: Doc<"conversations">
    limit: number
    session: Doc<"sessions">
  }
) {
  return await ctx.db
    .query("messages")
    .withIndex("by_conversation", (query) => {
      const scoped = query
        .eq("tenantId", args.conversation.tenantId)
        .eq("integrationId", args.conversation.integrationId)
        .eq("conversationId", args.conversation.conversationId)

      return args.session.cursor === undefined
        ? scoped
        : scoped.gte("_creationTime", args.session.cursor.timestamp)
    })
    .order("asc")
    .take(args.limit)
}

function isTerminalStatus(status: Doc<"runs">["status"]) {
  return status === "completed" || status === "failed" || status === "stopped"
}

function messageCursor(message: Doc<"messages">) {
  return {
    messageId: message._id,
    timestamp: message._creationTime,
  }
}

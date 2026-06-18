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

  if (session === null || session.state !== "active") {
    return null
  }

  if (session.executionId === undefined) {
    return session
  }

  const execution = await ctx.db.get(session.executionId)

  return execution !== null && isTerminalStatus(execution.status)
    ? null
    : session
}

export async function startSession(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">
    message: Doc<"messages">
    now: number
    runId: Id<"runs">
    tenantId: string
  }
) {
  const existing = await findSession(ctx, args.conversationId)
  const patch = {
    executionId: undefined,
    lastConsumedAt: args.message._creationTime,
    lastConsumedMessageId: args.message._id,
    runId: args.runId,
    state: "active" as const,
    updatedAt: args.now,
  }

  if (existing !== null) {
    await ctx.db.patch(existing._id, patch)
    return existing._id
  }

  return await ctx.db.insert("sessions", {
    tenantId: args.tenantId,
    conversationId: args.conversationId,
    createdAt: args.now,
    ...patch,
  })
}

export async function stopSession(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  now: number
) {
  await ctx.db.patch(session._id, {
    state: "idle",
    updatedAt: now,
  })
}

export async function recordSessionExecution(
  ctx: MutationCtx,
  args: {
    executionId: Id<"executions">
    runId: Id<"runs">
  }
) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_run", (query) => query.eq("runId", args.runId))
    .first()

  if (session !== null && session.runId === args.runId) {
    await ctx.db.patch(session._id, {
      executionId: args.executionId,
      updatedAt: Date.now(),
    })
  }
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

    if (session === null || session.state !== "active") {
      return { hasMore: false, messages: [] }
    }

    const limit = normalizeLimit(args.limit)
    const batch = await readPendingBatch(ctx, session, limit)

    if (batch.cursor !== undefined) {
      await ctx.db.patch(session._id, {
        lastConsumedAt: batch.cursor._creationTime,
        lastConsumedMessageId: batch.cursor._id,
        updatedAt: Date.now(),
      })
    }

    return {
      hasMore: batch.hasMore,
      messages: batch.messages.map(formatRuntimeMessage),
    }
  },
})

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

      return args.session.lastConsumedAt === undefined
        ? scoped
        : scoped.gte("_creationTime", args.session.lastConsumedAt)
    })
    .order("asc")
    .take(args.limit)
}

function isTerminalStatus(status: Doc<"executions">["status"]) {
  return status === "completed" || status === "failed" || status === "stopped"
}

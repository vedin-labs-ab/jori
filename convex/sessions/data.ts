import { v } from "convex/values"
import { isTerminalRunStatus } from "../../contracts/runtime/runs"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server"
import { conversationExecutionScope } from "../conversations/console/principal"
import { messageReplyTargetIdentifier } from "../messages/identifiers"
import { type QueryLikeCtx } from "../shared/context"
import {
  collectPendingBatch,
  defaultDrainLimit,
  maxPendingReadLimit,
  type PendingBatch,
} from "./batch"
import { initialCursor } from "./cursor"
import { initialRecency } from "./recency"

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
  const conversation = await ctx.db.get(args.conversationId)
  const patch = {
    executionScope:
      conversation === null
        ? undefined
        : await conversationExecutionScope(ctx, conversation),
    cursor: initialCursor(args.message, args.now),
    recency: initialRecency(args.message),
    runId: args.runId,
    target: messageReplyTargetIdentifier(args.message) ?? undefined,
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

export async function readPendingBatch(
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

/** Move the session's reply target, as `send_reply` does when it answers
 *  somewhere other than where the run last spoke. */
export const retarget = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    target: v.string(),
    runId: v.id("runs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)

    if (session?.runId !== args.runId) {
      return null
    }

    await ctx.db.patch(args.sessionId, {
      target: args.target,
      updatedAt: Date.now(),
    })

    return null
  },
})

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
        .eq("organizationId", args.conversation.organizationId)
        .eq("integrationId", args.conversation.integrationId)
        .eq("conversationId", args.conversation.externalId)

      return cursor === undefined
        ? scoped
        : scoped.gte("_creationTime", cursor.createdAt)
    })
    .order("asc")
    .take(args.limit)
}

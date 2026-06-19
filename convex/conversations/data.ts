import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { createMessageRunSnapshot } from "../runs/snapshot"
import { createQueuedExecution } from "../runtime/outbox"
import {
  createSlackRunStatus,
  reassertSlackRunStatus,
} from "../runtime/slack/lifecycle"
import {
  findReusableSession,
  readPendingMessages,
  startSession,
  stopSession,
} from "../sessions/data"

export async function findConversation(
  ctx: MutationCtx,
  args: {
    tenantId: string
    integrationId: Id<"integrations">
    conversationId: string | undefined
  }
) {
  if (args.conversationId === undefined) {
    return null
  }

  const conversationId = args.conversationId

  return await ctx.db
    .query("conversations")
    .withIndex("by_conversation", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("integrationId", args.integrationId)
        .eq("conversationId", conversationId)
    )
    .first()
}

export async function startMessageRun(
  ctx: MutationCtx,
  args: {
    conversation: Doc<"conversations"> | null
    integration: Doc<"integrations">
    message: Doc<"messages">
    conversationKey: string
    createdBy: string | undefined
    now: number
    replaceActiveSession?: boolean
  }
) {
  const conversation = args.conversation
  const activeSession =
    conversation === null || args.replaceActiveSession === true
      ? null
      : await findReusableSession(ctx, conversation._id)

  if (conversation !== null && activeSession !== null) {
    if (activeSession.runId !== undefined) {
      await reassertSlackRunStatus(ctx, {
        runId: activeSession.runId,
        now: args.now,
      })
    }

    return {
      status: "continued" as const,
      conversationId: conversation._id,
      messageId: args.message._id,
      sessionId: activeSession._id,
    }
  }

  const kind = conversation === null ? "mention" : "reply"
  const runId = await insertRun(ctx, { ...args, kind })

  await createSlackRunStatus(ctx, {
    integration: args.integration,
    message: args.message,
    runId,
    now: args.now,
  })

  const conversationId =
    conversation === null
      ? await ctx.db.insert("conversations", {
          tenantId: args.integration.tenantId,
          integrationId: args.integration._id,
          conversationId: args.conversationKey,
          rootRunId: runId,
          createdBy: args.createdBy,
          createdAt: args.now,
        })
      : conversation._id

  const sessionId = await startSession(ctx, {
    conversationId,
    message: args.message,
    runId,
    tenantId: args.integration.tenantId,
    now: args.now,
  })

  await createQueuedExecution(ctx, runId)

  return {
    status: "started" as const,
    conversationId,
    messageId: args.message._id,
    runId,
    sessionId,
  }
}

async function insertRun(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    message: Doc<"messages">
    createdBy: string | undefined
    now: number
    kind: "mention" | "reply"
  }
) {
  return await ctx.db.insert("runs", {
    tenantId: args.integration.tenantId,
    reason: {
      type: "message",
      messageId: args.message._id,
      kind: args.kind,
    },
    ...createMessageRunSnapshot({
      integration: args.integration,
      kind: args.kind,
      message: args.message,
    }),
    createdBy: args.createdBy,
    createdAt: args.now,
  })
}

export async function continuePendingConversationRun(
  ctx: MutationCtx,
  args: {
    runId: Id<"runs">
    now: number
  }
) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_run", (query) => query.eq("runId", args.runId))
    .first()

  if (session === null || session.runId !== args.runId) {
    return
  }

  const [message] = await readPendingMessages(ctx, session, 1)

  if (message === undefined) {
    await stopSession(ctx, session, args.now)
    return
  }

  const conversation = await ctx.db.get(session.conversationId)

  if (conversation === null) {
    await stopSession(ctx, session, args.now)
    return
  }

  const integration = await ctx.db.get(conversation.integrationId)

  if (integration === null || integration.status !== "active") {
    await stopSession(ctx, session, args.now)
    return
  }

  await startMessageRun(ctx, {
    conversation,
    integration,
    message,
    conversationKey: conversation.conversationId,
    createdBy: conversation.createdBy,
    now: args.now,
    replaceActiveSession: true,
  })
}

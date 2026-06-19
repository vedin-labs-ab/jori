import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { findRoutingByMessage } from "../routing/data"
import { createMessageRunSnapshot } from "../runs/snapshot"
import { createQueuedExecution } from "../runtime/outbox"
import { maxPendingReadLimit } from "../sessions/cursor"
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
    return {
      status: "continued" as const,
      conversationId: conversation._id,
      messageId: args.message._id,
      sessionId: activeSession._id,
      ...(activeSession.runId === undefined
        ? {}
        : { runId: activeSession.runId }),
    }
  }

  const kind = conversation === null ? "mention" : "reply"
  const runId = await insertRun(ctx, { ...args, kind })

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

  await continueSession(ctx, session, args.now)
}

export async function continueTerminalConversationSession(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">
    now: number
  }
) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_conversation", (query) =>
      query.eq("conversationId", args.conversationId)
    )
    .first()

  if (
    session === null ||
    session.state !== "active" ||
    !(await isTerminalSession(ctx, session))
  ) {
    return
  }

  await continueSession(ctx, session, args.now)
}

async function continueSession(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  now: number
) {
  const pending = await readPendingContinuationMessage(ctx, session)

  if (pending.status === "wait") {
    return
  }

  if (pending.message === undefined) {
    await stopSession(ctx, session, now)
    return
  }

  const conversation = await ctx.db.get(session.conversationId)

  if (conversation === null) {
    await stopSession(ctx, session, now)
    return
  }

  const integration = await ctx.db.get(conversation.integrationId)

  if (integration === null || integration.status !== "active") {
    await stopSession(ctx, session, now)
    return
  }

  await startMessageRun(ctx, {
    conversation,
    integration,
    message: pending.message,
    conversationKey: conversation.conversationId,
    createdBy: conversation.createdBy,
    now,
    replaceActiveSession: true,
  })
}

async function readPendingContinuationMessage(
  ctx: MutationCtx,
  session: Doc<"sessions">
) {
  const messages = await readPendingMessages(ctx, session, maxPendingReadLimit)

  for (const message of messages) {
    const action = await readContinuationAction(ctx, message)

    if (action === "start") {
      return { status: "start" as const, message }
    }

    if (action === "wait") {
      return { status: "wait" as const }
    }
  }

  return { status: "idle" as const }
}

async function readContinuationAction(
  ctx: MutationCtx,
  message: Doc<"messages">
) {
  if (message.integration !== "slack") {
    return "start"
  }

  const routing = await findRoutingByMessage(ctx, message._id)

  if (routing === null) {
    return "wait"
  }

  return routing.route === "agent" ? "start" : "skip"
}

async function isTerminalSession(ctx: MutationCtx, session: Doc<"sessions">) {
  if (session.executionId === undefined) {
    return false
  }

  const execution = await ctx.db.get(session.executionId)

  return execution !== null && isTerminalStatus(execution.status)
}

function isTerminalStatus(status: Doc<"executions">["status"]) {
  return status === "completed" || status === "failed" || status === "stopped"
}

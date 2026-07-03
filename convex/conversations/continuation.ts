import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { type MessageIntegration, resolveMessageOwner } from "../messages/data"
import { isTerminalRunStatus } from "../runs/schema"
import { maxPendingReadLimit } from "../sessions/cursor"
import { readPendingMessages, stopSession } from "../sessions/data"
import { isPersonActor } from "../shared/actor"
import { startMessageRun } from "./data"

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

  if (session === null || !(await isTerminalSession(ctx, session))) {
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

  if (pending.message === undefined) {
    await stopSession(ctx, session, now)
    return
  }

  if (session.conversationId === undefined) {
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

  if (!isMessageIntegration(pending.message.integration)) {
    await stopSession(ctx, session, now)
    return
  }

  await startMessageRun(ctx, {
    integration,
    message: pending.message,
    createdBy: await resolveMessageOwner(ctx, {
      integration: pending.message.integration,
      tenantId: integration.tenantId,
      message: pending.message,
    }),
    externalId: conversation.externalId,
    now,
    replaceActiveSession: true,
    conversation,
  })
}

async function readPendingContinuationMessage(
  ctx: MutationCtx,
  session: Doc<"sessions">
) {
  const messages = await readPendingMessages(ctx, session, maxPendingReadLimit)

  for (const message of messages) {
    if (shouldStartContinuation(message)) {
      return { status: "start" as const, message }
    }
  }

  return { status: "idle" as const }
}

function shouldStartContinuation(message: Doc<"messages">) {
  if (!isPersonActor(message.actor)) {
    return false
  }

  return hasText(message)
}

function hasText(message: Doc<"messages">) {
  const text = message.text?.trim()

  return text !== undefined && text !== ""
}

function isMessageIntegration(
  integration: Doc<"messages">["integration"]
): integration is MessageIntegration {
  return (
    integration === "github" ||
    integration === "linear" ||
    integration === "slack"
  )
}

async function isTerminalSession(ctx: MutationCtx, session: Doc<"sessions">) {
  const runId = session.runId

  if (runId === undefined) {
    return false
  }

  const run = await ctx.db.get(runId)

  return run !== null && isTerminalRunStatus(run.status)
}

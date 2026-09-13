import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { messageHasText, resolveMessageOwner } from "../messages/data"
import { maxPendingReadLimit } from "../sessions/batch"
import { readPendingMessages, stopSession } from "../sessions/data"
import { findSessionByRun } from "../sessions/read"
import { isPersonActor } from "../shared/actor"
import { startMessageRun } from "./execution/index"

export async function continuePendingConversationRun(
  ctx: MutationCtx,
  args: {
    runId: Id<"runs">
    now: number
  }
) {
  const session = await findSessionByRun(ctx, args.runId)

  if (session === null || session.runId !== args.runId) {
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

  const conversation = await ctx.db.get(session.conversationId)

  if (conversation === null) {
    await stopSession(ctx, session, now)
    return
  }

  const integration = await conversationIntegration(ctx, conversation)

  // A provider conversation whose integration is gone or inactive cannot
  // continue; the console has none to lose.
  if (conversation.surface !== "console" && integration?.status !== "active") {
    await stopSession(ctx, session, now)
    return
  }

  await startMessageRun(ctx, {
    integration,
    message: pending.message,
    createdBy: await resolveMessageOwner(ctx, {
      surface: pending.message.surface,
      organizationId: conversation.organizationId,
      message: pending.message,
    }),
    externalId: conversation.externalId,
    now,
    replaceActiveSession: true,
    conversation,
  })
}

async function conversationIntegration(
  ctx: MutationCtx,
  conversation: Doc<"conversations">
) {
  return conversation.integrationId === undefined
    ? null
    : await ctx.db.get(conversation.integrationId)
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

  return messageHasText(message)
}

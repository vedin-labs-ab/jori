import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { conversationVisibility } from "../messages/surface"
import { resolveRunAudience } from "../runs/introspect/audience"
import { createMessageRunSnapshot } from "../runs/snapshot"
import { queueRun } from "../runtime/outbox"
import { wakeRun } from "../runtime/waiters/data"
import { findSession, isReusableSession, startSession } from "../sessions/data"
import { isFreshRunWithoutWaiter } from "./fresh"
import { findConversation } from "./resolve"

type StartMessageRunArgs = {
  conversation: Doc<"conversations"> | null
  integration: Doc<"integrations">
  message: Doc<"messages">
  createdBy: Id<"persons"> | undefined
  externalId: string
  now: number
  replaceActiveSession?: boolean
}

export async function ensureConversation(
  ctx: MutationCtx,
  args: {
    externalId: string
    integration: Doc<"integrations">
    message: Doc<"messages">
  }
) {
  const conversation = await findConversation(ctx, {
    tenantId: args.integration.tenantId,
    integrationId: args.integration._id,
    externalId: args.externalId,
  })

  if (conversation !== null) {
    return conversation
  }

  return await insertConversation(ctx, {
    externalId: args.externalId,
    integration: args.integration,
    message: args.message,
  })
}

async function insertConversation(
  ctx: MutationCtx,
  args: {
    externalId: string
    integration: Doc<"integrations">
    message: Doc<"messages">
  }
) {
  const conversationId = await ctx.db.insert("conversations", {
    tenantId: args.integration.tenantId,
    integrationId: args.integration._id,
    externalId: args.externalId,
    visibility: conversationVisibility(args.message, args.integration),
  })
  const conversation = await ctx.db.get(conversationId)

  if (conversation === null) {
    throw new Error("Conversation insert failed.")
  }

  return conversation
}

export async function startMessageRun(
  ctx: MutationCtx,
  args: StartMessageRunArgs
) {
  const conversation = args.conversation
  const session =
    conversation === null ? null : await findSession(ctx, conversation._id)
  const activeSession =
    session === null || args.replaceActiveSession === true
      ? null
      : await isReusableSession(ctx, session)

  if (conversation !== null && activeSession !== null) {
    if (activeSession.runId !== undefined) {
      const woken = await wakeRun(ctx, {
        runId: activeSession.runId,
        reason: "message",
        subject: { kind: "message", id: args.message._id },
      })

      if (
        !woken &&
        !(await isFreshRunWithoutWaiter(ctx, activeSession.runId, args.now))
      ) {
        return await startNewMessageRun(ctx, args, session)
      }
    }

    return {
      status: "continued" as const,
      messageId: args.message._id,
      sessionId: activeSession._id,
      conversationId: conversation._id,
      ...(activeSession.runId === undefined
        ? {}
        : { runId: activeSession.runId }),
    }
  }

  return await startNewMessageRun(ctx, args, session)
}

async function startNewMessageRun(
  ctx: MutationCtx,
  args: StartMessageRunArgs,
  session: Doc<"sessions"> | null
) {
  const kind = session === null ? "mention" : "reply"
  const conversation =
    args.conversation ??
    (await insertConversation(ctx, {
      externalId: args.externalId,
      integration: args.integration,
      message: args.message,
    }))
  const runId = await insertRun(ctx, { ...args, conversation, kind })

  const sessionId = await startSession(ctx, {
    conversationId: conversation._id,
    message: args.message,
    runId,
    now: args.now,
  })

  await queueRun(ctx, runId)

  return {
    status: "started" as const,
    messageId: args.message._id,
    runId,
    sessionId,
    conversationId: conversation._id,
  }
}

async function insertRun(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    message: Doc<"messages">
    conversation: Doc<"conversations">
    createdBy: Id<"persons"> | undefined
    now: number
    kind: "mention" | "reply"
  }
) {
  return await ctx.db.insert("runs", {
    tenantId: args.integration.tenantId,
    cause: {
      type: "message",
      messageId: args.message._id,
      kind: args.kind,
    },
    ...createMessageRunSnapshot({
      integration: args.integration,
      kind: args.kind,
      message: args.message,
    }),
    ...(await resolveRunAudience(ctx, {
      origin: {
        conversation: {
          conversation: args.conversation,
          integration: args.integration,
        },
      },
      run: { createdBy: args.createdBy },
    })),
    status: "queued",
    createdBy: args.createdBy,
    createdAt: args.now,
  })
}

import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { createMessageRunSnapshot } from "../runs/snapshot"
import { createQueuedExecution } from "../runtime/outbox"
import { findReusableSession, startSession } from "../sessions/data"

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

export async function ensureConversation(
  ctx: MutationCtx,
  args: {
    tenantId: string
    integrationId: Id<"integrations">
    conversationId: string | undefined
    createdBy: string | undefined
    now: number
  }
) {
  const conversation = await findConversation(ctx, args)

  if (conversation !== null || args.conversationId === undefined) {
    return conversation
  }

  const conversationId = await ctx.db.insert("conversations", {
    tenantId: args.tenantId,
    integrationId: args.integrationId,
    conversationId: args.conversationId,
    createdBy: args.createdBy,
    createdAt: args.now,
  })

  return await ctx.db.get(conversationId)
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

  const kind =
    conversation === null || conversation.rootRunId === undefined
      ? "mention"
      : "reply"
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

  if (conversation !== null && conversation.rootRunId === undefined) {
    await ctx.db.patch(conversation._id, { rootRunId: runId })
  }

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

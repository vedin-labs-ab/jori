import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { createMessageRunSnapshot } from "../runs/snapshot"
import { queueRun } from "../runtime/outbox"
import { findSession, isReusableSession, startSession } from "../sessions/data"

export async function findConversation(
  ctx: MutationCtx,
  args: {
    tenantId: string
    integrationId: Id<"integrations">
    externalId: string | undefined
  }
) {
  if (args.externalId === undefined) {
    return null
  }

  const externalId = args.externalId

  return await ctx.db
    .query("conversations")
    .withIndex("by_tenant_and_integration_and_external", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("integrationId", args.integrationId)
        .eq("externalId", externalId)
    )
    .first()
}

export async function ensureConversation(
  ctx: MutationCtx,
  args: {
    tenantId: string
    integrationId: Id<"integrations">
    externalId: string | undefined
  }
) {
  const conversation = await findConversation(ctx, args)

  if (conversation !== null || args.externalId === undefined) {
    return conversation
  }

  const conversationId = await ctx.db.insert("conversations", {
    tenantId: args.tenantId,
    integrationId: args.integrationId,
    externalId: args.externalId,
  })

  return await ctx.db.get(conversationId)
}

export async function startMessageRun(
  ctx: MutationCtx,
  args: {
    conversation: Doc<"conversations"> | null
    integration: Doc<"integrations">
    message: Doc<"messages">
    createdBy: string | undefined
    externalId: string
    now: number
    replaceActiveSession?: boolean
  }
) {
  const conversation = args.conversation
  const session =
    conversation === null ? null : await findSession(ctx, conversation._id)
  const activeSession =
    session === null || args.replaceActiveSession === true
      ? null
      : await isReusableSession(ctx, session)

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

  const kind = session === null ? "mention" : "reply"
  const runId = await insertRun(ctx, { ...args, kind })

  const conversationId =
    conversation === null
      ? await ctx.db.insert("conversations", {
          tenantId: args.integration.tenantId,
          integrationId: args.integration._id,
          externalId: args.externalId,
        })
      : conversation._id

  const sessionId = await startSession(ctx, {
    conversationId,
    message: args.message,
    runId,
    now: args.now,
  })

  await queueRun(ctx, runId)

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
    status: "queued",
    createdBy: args.createdBy,
    createdAt: args.now,
  })
}
